import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { Goal, GOAL_STATUS_LIST, GoalStatus, PRIORITY_STATUS_LIST } from "../../../../models/goal";
import { CurrentCategoryService } from "../../../../services/current-category.service";
import { MatDialog } from "@angular/material/dialog";
import { GoalEditComponent } from "../goal-edit/goal-edit.component";
import { BehaviorSubject, debounceTime, filter, map, Observable, of, shareReplay, switchMap, take } from "rxjs";
import { UntilDestroy, untilDestroyed } from "@ngneat/until-destroy";
import { DataSource } from "../../../../services/data-source";
import { DataSourceQuery, ResultPage } from "../../../../models/page";
import { GoalsService } from "../../../../services/goals.service";
import { CategoriesService } from "../../../../services/categories.service";
import { CdkDragDrop, moveItemInArray, transferArrayItem } from "@angular/cdk/drag-drop";
import { prepareDate } from "../../../shared/helpers/form";
import { FormControl } from "@angular/forms";
import { GoalDetailComponent } from "../goal-detail/goal-detail.component";
import { ActivatedRoute, Router } from "@angular/router";
import { BoardsService } from "../../../../services/boards.service";

const GOAL_FORM_HEIGHT = 440;
const BOTTOM_OFFSET = 350;
const ORDER_FIELD_LIST = [
  { id: '', title: 'По приоритету и дедлайну' },
  { id: 'priority', title: 'По приоритету' },
  { id: 'due_date', title: 'По дедлайну' },
];

interface SearchForm {
  search: string;
  board: number | '';
  priority__in: number[];
  category__in: number[];
  status__in: number[];
  due_date__lte: string | null;
  due_date__gte: string | null;
}

@UntilDestroy()
@Component({
  selector: 'app-goals',
  templateUrl: './goals.component.html',
  styleUrls: ['./goals.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoalsComponent implements OnDestroy, OnInit {
  statusList = GOAL_STATUS_LIST;
  orderList = ORDER_FIELD_LIST;
  priorityMap: Record<number, string>;
  priorityList = PRIORITY_STATUS_LIST;
  category$ = this.currentCategoryService.category$;
  categoriesMap$: Observable<Record<number, string>>;
  categories$ = this.categoriesService.allList$;
  dataSource?: DataSource<Goal, SearchForm>;
  isLoading$!: Observable<boolean>;
  listByStatus$ = new BehaviorSubject<Record<GoalStatus, Goal[]>>(this.prepareItems([]));
  searchControl = new FormControl('');
  orderControl = new FormControl('');
  boards$ = this.boardsService.boards$.pipe(
    map(list => ([{ id: '', title: 'Все' }, ...list]))
  );

  constructor(
    private currentCategoryService: CurrentCategoryService,
    private categoriesService: CategoriesService,
    private goalsService: GoalsService,
    private dialog: MatDialog,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private boardsService: BoardsService,
  ) {
    this.priorityMap = PRIORITY_STATUS_LIST.reduce((obj, item) => ({
      ...obj,
      [item.id]: item.title
    }), {});
    this.categoriesMap$ = this.categoriesService.allList$.pipe(
      map(list => list.reduce((obj, item) => ({
        ...obj,
        [item.id]: item.title,
      }), {})),
      shareReplay({ refCount: true, bufferSize: 1 }),
    );
  }

  ngOnInit(): void {
    const { categoryId, boardId } = this.activatedRoute.snapshot.params;

    this.dataSource = new DataSource<Goal, SearchForm>(
      {
        search: '',
        board: boardId ? parseInt(boardId) : '',
        priority__in: [],
        category__in: categoryId ? [parseInt(categoryId)] : [],
        status__in: [],
        due_date__lte: null,
        due_date__gte: null,
      },
      this.loadGoals.bind(this),
      this.goalsService.refresh$,
    );
    this.dataSource.list$.pipe(
      map(list => this.prepareItems(list)),
      untilDestroyed(this),
    ).subscribe(data => {
      this.listByStatus$.next(data);
    });
    this.isLoading$ = this.dataSource.isLoading$;

    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      untilDestroyed(this)
    ).subscribe(search => {
      this.dataSource?.searchForm.patchValue({ search });
    })

    this.orderControl.valueChanges.pipe(
      untilDestroyed(this)
    ).subscribe(field => {
      this.dataSource?.setOrderField(field);
    })

    this.handlePopup();
  }

  ngOnDestroy(): void {
    this.dataSource?.destroy();
  }

  openEditPopup(goal: Partial<Goal>, doomRect?: DOMRect): void {
    const maxTop = screen.availHeight - GOAL_FORM_HEIGHT - BOTTOM_OFFSET;

    this.dialog.open(GoalEditComponent, {
      data: goal,
      ...(!doomRect ? {} : {
        position: {
          top: Math.min(doomRect.top + 50, maxTop) + 'px',
          left: doomRect.left + 'px'
        }
      })
    });
  }

  openGoal(goal: Goal): void {
    this.router.navigate([], {
      queryParams: { goal: goal.id }
    });
  }

  addGoal(status: GoalStatus, elem: any): void {
    const doomRect = elem._elementRef.nativeElement.getBoundingClientRect();
    const { categoryId, boardId } = this.activatedRoute.snapshot.params;

    this.openEditPopup({
      status,
      category: categoryId ? parseInt(categoryId) : 0,
      board: boardId ? parseInt(boardId) : 0,
    }, doomRect);
  }

  trackById(item: Goal): number {
    return item.id;
  }

  drop(event: CdkDragDrop<GoalStatus, GoalStatus, Goal>): void {
    if (event.previousContainer === event.container) {
      const currentList = this.listByStatus$.getValue()[event.container.data];
      moveItemInArray(currentList, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        this.listByStatus$.getValue()[event.previousContainer.data],
        this.listByStatus$.getValue()[event.container.data],
        event.previousIndex,
        event.currentIndex,
      );

      this.goalsService.updateGoal({
        ...event.item.data,
        status: event.container.data
      }, event.item.data.id, true).subscribe();
    }
  }

  private handlePopup(): void {
    this.activatedRoute.queryParams.pipe(
      filter(param => !!param['goal']),
      switchMap(params => this.dialog.open(GoalDetailComponent, {
        data: parseInt(params['goal']!),
      }).afterClosed()),
      untilDestroyed(this)
    ).subscribe(res => {
      this.router.navigate([]);

      if (res?.action === 'delete') {
        this.goalsService.deleteGoal(res.id).subscribe();
      }

      if (res?.action === 'edit') {
        this.openEditPopup(res.goal);
      }
    })
  }

  private prepareItems(list: Goal[]): Record<GoalStatus, Goal[]> {
    return GOAL_STATUS_LIST.reduce((obj, item) => ({
      ...obj,
      [item.id]: list.filter(it => it.status === item.id)
    }), {}) as Record<GoalStatus, Goal[]>;
  }

  private loadGoals(query: DataSourceQuery<SearchForm>): Observable<ResultPage<Goal>> {
    return this.goalsService.loadGoals({
      offset: query.offset,
      limit: 300,
      search: query.search.search,
      ordering: query.orderField,
      category__in: query.search.category__in.join(','),
      priority__in: query.search.priority__in.join(','),
      status__in: query.search.status__in.join(','),
      due_date__lte: prepareDate(query.search.due_date__lte),
      due_date__gte: prepareDate(query.search.due_date__gte),
      board: query.search.board || undefined,
    })
  }

}

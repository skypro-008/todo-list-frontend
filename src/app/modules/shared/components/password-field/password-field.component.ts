import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component, ContentChild,
  EventEmitter,
  Input,
  Optional,
  Output
} from '@angular/core';
import {FormControl} from '@angular/forms';
import {map, merge, Observable} from 'rxjs';
import {FormValidatorService} from "../../../../services/form-validator.service";
import {VALIDATION_ERRORS} from "../../../../models/validation";
import {Entity} from "../../../../models/base";
import {IonInput} from '@ionic/angular';

@Component({
  selector: 'app-password-field',
  templateUrl: './password-field.component.html',
  styleUrls: ['./password-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordFieldComponent {
  hide = true;
  @Input() placeholder = '';
  @Input() label = '';
  @Input() control!: FormControl;
  @Input() type: 'password';
  @Input() selectList!: Entity[];
  @Input() multiple = false;

  @Output() submit = new EventEmitter<void>();

  isError$!: Observable<boolean>;

  @ContentChild(IonInput) input: IonInput;

  constructor(
    @Optional() private formValidatorService: FormValidatorService,
  ) {
  }

  toggleShow() {
    this.hide = !this.hide;
    this.input.type = this.hide ? 'password' : 'text';
  }

  ngOnInit(): void {
    if (!this.formValidatorService) {
      return;
    }

    this.isError$ = merge(
      this.formValidatorService.update$,
      this.control.valueChanges,
    ).pipe(
      map(() => !this.control.valid)
    );
  }

  getErrorMessage(): string {
    if (!this.control.errors) {
      return '';
    }

    return Object.entries(this.control.errors)
      .map(([key, value]) => {
        if (typeof value === 'string') {
          return value;
        }

        return key;
      }).map(error => VALIDATION_ERRORS[error] || error).join(',')
  }

}

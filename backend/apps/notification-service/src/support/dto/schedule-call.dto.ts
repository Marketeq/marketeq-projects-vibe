import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * A call request from Contact Support > Schedule a Call.
 *
 * `date` and `time` are free text because the form collects them as text —
 * there is no picker yet, so no guarantee they parse. They are relayed
 * verbatim for a human to read rather than coerced into a timestamp that
 * would be wrong without a timezone.
 */
export class ScheduleCallDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required.' })
  @MaxLength(200)
  name: string;

  @IsEmail({}, { message: 'Enter a valid email address.' })
  @MaxLength(254)
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone number is required.' })
  @MaxLength(40)
  phone: string;

  @IsString()
  @IsNotEmpty({ message: 'Preferred date is required.' })
  @MaxLength(100)
  date: string;

  @IsString()
  @IsNotEmpty({ message: 'Preferred time is required.' })
  @MaxLength(100)
  time: string;
}

import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * A message from the Contact Support > Email Us form.
 *
 * Reachable while signed out — the whole point is that the sender cannot get
 * into their account — so every field is attacker-controlled and length-capped
 * here rather than trusted from the client.
 */
export class SupportMessageDto {
  @IsString()
  @IsNotEmpty({ message: 'First name is required.' })
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required.' })
  @MaxLength(100)
  lastName: string;

  @IsEmail({}, { message: 'Enter a valid email address.' })
  @MaxLength(254)
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Subject is required.' })
  @MaxLength(200)
  subject: string;

  @IsString()
  @MinLength(1, { message: 'Message is required.' })
  @MaxLength(5000)
  message: string;
}

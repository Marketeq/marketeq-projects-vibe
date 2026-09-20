import { IsIn } from 'class-validator';

export class DocumentUploadUrlRequestDto {
  @IsIn(['jpg', 'jpeg', 'png', 'pdf'], {
    message: 'fileExtension must be one of: jpg, jpeg, png, pdf',
  })
  fileExtension!: string;
}

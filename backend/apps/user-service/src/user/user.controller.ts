import {
  Controller, Get, Post, Put, Patch, Delete,
  Param, Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { Education } from '../education/entities/education.entity';
import { Experience } from '../experience/entities/experience.entity';
import { Skill } from '../skills/entities/skill.entity';
import { Language } from '../languages/entities/language.entity';
import { Certification } from '../certifications/entities/certification.entity';
import { Industry } from '../industries/entities/industry.entity';

@Controller('v1/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // --- User core ---
  @Post()
  create(@Body() dto: Partial<User>) {
    return this.userService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Get('username/:username')
  findByUsername(@Param('username') username: string) {
    return this.userService.findByUsername(username);
  }

  @Post('check-username')
  checkUsername(@Body('username') username: string) {
    return this.userService.checkUsername(username);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<User>) {
    return this.userService.update(id, dto);
  }

  @Patch(':id/onboarding/dismiss')
  @HttpCode(HttpStatus.OK)
  dismissOnboarding(@Param('id') id: string) {
    return this.userService.dismissOnboarding(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }

  @Get('health')
  health() {
    return { status: 'ok', service: 'user-service' };
  }

  // --- Education ---
  @Post(':id/education')
  addEducation(@Param('id') id: string, @Body() dto: Partial<Education>) {
    return this.userService.addEducation(id, dto);
  }
  @Put(':id/education/:eduId')
  updateEducation(@Param('eduId') eduId: string, @Body() dto: Partial<Education>) {
    return this.userService.updateEducation(eduId, dto);
  }
  @Delete(':id/education/:eduId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeEducation(@Param('eduId') eduId: string) {
    return this.userService.removeEducation(eduId);
  }

  // --- Experience ---
  @Post(':id/work')
  addExperience(@Param('id') id: string, @Body() dto: Partial<Experience>) {
    return this.userService.addExperience(id, dto);
  }
  @Put(':id/work/:workId')
  updateExperience(@Param('workId') workId: string, @Body() dto: Partial<Experience>) {
    return this.userService.updateExperience(workId, dto);
  }
  @Delete(':id/work/:workId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeExperience(@Param('workId') workId: string) {
    return this.userService.removeExperience(workId);
  }

  // --- Skills ---
  @Post(':id/skills')
  addSkill(@Param('id') id: string, @Body() dto: Partial<Skill>) {
    return this.userService.addSkill(id, dto);
  }
  @Put(':id/skills/:skillId')
  updateSkill(@Param('skillId') skillId: string, @Body() dto: Partial<Skill>) {
    return this.userService.updateSkill(skillId, dto);
  }
  @Delete(':id/skills/:skillId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeSkill(@Param('skillId') skillId: string) {
    return this.userService.removeSkill(skillId);
  }

  // --- Languages ---
  @Post(':id/languages')
  addLanguage(@Param('id') id: string, @Body() dto: Partial<Language>) {
    return this.userService.addLanguage(id, dto);
  }
  @Put(':id/languages/:langId')
  updateLanguage(@Param('langId') langId: string, @Body() dto: Partial<Language>) {
    return this.userService.updateLanguage(langId, dto);
  }
  @Delete(':id/languages/:langId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeLanguage(@Param('langId') langId: string) {
    return this.userService.removeLanguage(langId);
  }

  // --- Certifications ---
  @Post(':id/certifications')
  addCertification(@Param('id') id: string, @Body() dto: Partial<Certification>) {
    return this.userService.addCertification(id, dto);
  }
  @Put(':id/certifications/:certId')
  updateCertification(@Param('certId') certId: string, @Body() dto: Partial<Certification>) {
    return this.userService.updateCertification(certId, dto);
  }
  @Delete(':id/certifications/:certId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeCertification(@Param('certId') certId: string) {
    return this.userService.removeCertification(certId);
  }

  // --- Industries ---
  @Post(':id/industries')
  addIndustry(@Param('id') id: string, @Body() dto: Partial<Industry>) {
    return this.userService.addIndustry(id, dto);
  }
  @Delete(':id/industries/:industryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeIndustry(@Param('industryId') industryId: string) {
    return this.userService.removeIndustry(industryId);
  }

  // --- RabbitMQ message handlers ---
  @MessagePattern('user.findById')
  handleFindById(@Payload() data: { id: string }) {
    return this.userService.findById(data.id);
  }

  @MessagePattern('user.findByEmail')
  handleFindByEmail(@Payload() data: { email: string }) {
    return this.userService.findByEmail(data.email);
  }

  @MessagePattern('user.create')
  handleCreate(@Payload() dto: Partial<User>) {
    return this.userService.create(dto);
  }
}

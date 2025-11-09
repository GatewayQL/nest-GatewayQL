import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScopeEntity } from '../models/scope.entity';
import { CreateScopeInput } from '../dto/create-scope.input';
import { UpdateScopeInput } from '../dto/update-scope.input';

@Injectable()
export class ScopesService {
  constructor(
    @InjectRepository(ScopeEntity)
    private readonly scopeRepository: Repository<ScopeEntity>,
  ) {}

  async create(createScopeInput: CreateScopeInput): Promise<ScopeEntity> {
    const newScope = new ScopeEntity();
    newScope.name = createScopeInput.name;
    newScope.description = createScopeInput.description;

    const createdScope = this.scopeRepository.create(newScope);

    try {
      return await this.scopeRepository.save(createdScope);
    } catch (e) {
      throw new BadRequestException(
        'Cannot create scope in database. Error: ' + e.message,
      );
    }
  }

  async findAll(): Promise<ScopeEntity[]> {
    return await this.scopeRepository.find();
  }

  async findOne(id: string): Promise<ScopeEntity> {
    const scope = await this.scopeRepository.findOne({
      where: { id },
    });

    if (!scope) {
      throw new NotFoundException(`Scope with ID ${id} not found`);
    }

    return scope;
  }

  async findByName(name: string): Promise<ScopeEntity> {
    const scope = await this.scopeRepository.findOne({
      where: { name },
    });

    if (!scope) {
      throw new NotFoundException(`Scope with name ${name} not found`);
    }

    return scope;
  }

  async update(
    id: string,
    updateScopeInput: UpdateScopeInput,
  ): Promise<ScopeEntity> {
    const scope = await this.findOne(id);

    if (!scope) {
      throw new NotFoundException(`Scope with ID ${id} not found`);
    }

    // Update only provided fields
    if (updateScopeInput.name !== undefined) {
      scope.name = updateScopeInput.name;
    }
    if (updateScopeInput.description !== undefined) {
      scope.description = updateScopeInput.description;
    }

    try {
      return await this.scopeRepository.save(scope);
    } catch (e) {
      throw new BadRequestException(
        'Cannot update scope in database. Error: ' + e.message,
      );
    }
  }

  async remove(id: string): Promise<ScopeEntity> {
    const scope = await this.findOne(id);

    try {
      await this.scopeRepository.delete(id);
      return scope;
    } catch (e) {
      throw new BadRequestException(
        'Cannot delete scope from database. Error: ' + e.message,
      );
    }
  }
}

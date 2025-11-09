import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppEntity } from '../models/app.entity';
import { CreateAppInput } from '../dto/create-app.input';
import { UpdateAppInput } from '../dto/update-app.input';

@Injectable()
export class AppsService {
  constructor(
    @InjectRepository(AppEntity)
    private readonly appRepository: Repository<AppEntity>,
  ) {}

  async create(createAppInput: CreateAppInput): Promise<AppEntity> {
    const newApp = new AppEntity();
    newApp.name = createAppInput.name;
    newApp.description = createAppInput.description;
    newApp.redirectUri = createAppInput.redirectUri;
    newApp.isActive = createAppInput.isActive ?? true;

    // Set the user relationship
    newApp.user = { id: createAppInput.userId } as any;

    const createdApp = this.appRepository.create(newApp);

    try {
      return await this.appRepository.save(createdApp);
    } catch (e) {
      throw new BadRequestException(
        'Cannot create app in database. Error: ' + e.message,
      );
    }
  }

  async findAll(): Promise<AppEntity[]> {
    return await this.appRepository.find({
      relations: ['user'],
    });
  }

  async findOne(id: string): Promise<AppEntity> {
    const app = await this.appRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!app) {
      throw new NotFoundException(`App with ID ${id} not found`);
    }

    return app;
  }

  async findByUserId(userId: string): Promise<AppEntity[]> {
    return await this.appRepository.find({
      where: { user: { id: userId } },
      relations: ['user'],
    });
  }

  async findByName(name: string): Promise<AppEntity> {
    return await this.appRepository.findOne({
      where: { name },
      relations: ['user'],
    });
  }

  async findByNameAndUserId(name: string, userId: string): Promise<AppEntity> {
    return await this.appRepository.findOne({
      where: { name, user: { id: userId } },
      relations: ['user'],
    });
  }

  async update(id: string, updateAppInput: UpdateAppInput): Promise<AppEntity> {
    const app = await this.findOne(id);

    if (!app) {
      throw new NotFoundException(`App with ID ${id} not found`);
    }

    // Update only provided fields
    if (updateAppInput.name !== undefined) {
      app.name = updateAppInput.name;
    }
    if (updateAppInput.description !== undefined) {
      app.description = updateAppInput.description;
    }
    if (updateAppInput.redirectUri !== undefined) {
      app.redirectUri = updateAppInput.redirectUri;
    }
    if (updateAppInput.isActive !== undefined) {
      app.isActive = updateAppInput.isActive;
    }

    try {
      return await this.appRepository.save(app);
    } catch (e) {
      throw new BadRequestException(
        'Cannot update app in database. Error: ' + e.message,
      );
    }
  }

  async activate(id: string): Promise<AppEntity> {
    const app = await this.findOne(id);
    app.isActive = true;
    return await this.appRepository.save(app);
  }

  async deactivate(id: string): Promise<AppEntity> {
    const app = await this.findOne(id);
    app.isActive = false;
    return await this.appRepository.save(app);
  }

  async remove(id: string): Promise<AppEntity> {
    const app = await this.findOne(id);

    try {
      await this.appRepository.delete(id);
      return app;
    } catch (e) {
      throw new BadRequestException(
        'Cannot delete app from database. Error: ' + e.message,
      );
    }
  }

  async findActiveApps(): Promise<AppEntity[]> {
    return await this.appRepository.find({
      where: { isActive: true },
      relations: ['user'],
    });
  }

  async findInactiveApps(): Promise<AppEntity[]> {
    return await this.appRepository.find({
      where: { isActive: false },
      relations: ['user'],
    });
  }
}

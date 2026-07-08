import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Gender } from '@prisma/client';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    register: jest.fn().mockResolvedValue({ access_token: 'mock-token', userId: 'user-id' }),
    login: jest.fn().mockResolvedValue({ access_token: 'mock-token', userId: 'user-id' }),
    deleteAccount: jest.fn().mockResolvedValue({ success: true, message: 'Compte supprimé avec succès' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register and return the result', async () => {
      const dto: RegisterDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1990-01-01',
        gender: Gender.H,
        city: 'Paris',
        telephone: '0102030405',
      };

      const result = await controller.register(dto);

      expect(service.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ access_token: 'mock-token', userId: 'user-id' });
    });
  });

  describe('login', () => {
    it('should call authService.login and return the result', async () => {
      const dto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = await controller.login(dto);

      expect(service.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ access_token: 'mock-token', userId: 'user-id' });
    });
  });

  describe('deleteAccount', () => {
    it('should call authService.deleteAccount and return success message', async () => {
      const req = { user: { id: 'user-id' } };
      const result = await controller.deleteAccount(req);

      expect(service.deleteAccount).toHaveBeenCalledWith('user-id');
      expect(result).toEqual({ success: true, message: 'Compte supprimé avec succès' });
    });
  });
});

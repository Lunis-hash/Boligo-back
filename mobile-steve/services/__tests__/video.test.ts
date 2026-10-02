jest.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

import client from '@/services/api';
import { VideoService } from '@/services/video';

const mocked = client as unknown as { get: jest.Mock; post: jest.Mock };

describe('VideoService', () => {
  beforeEach(() => {
    mocked.get.mockReset();
    mocked.post.mockReset();
  });

  it('ends a call with the payload expected by POST /video/end', async () => {
    mocked.post.mockResolvedValue({ data: { success: true, advanced: true, currentStep: 'echange_contacts' } });
    const res = await VideoService.end('journey-1', 42.6);
    expect(mocked.post).toHaveBeenCalledWith('/video/end', { journeyId: 'journey-1', durationSec: 43 });
    expect(res.advanced).toBe(true);
  });

  it('omits durationSec when unknown', async () => {
    mocked.post.mockResolvedValue({ data: { success: true, advanced: false, currentStep: 'video' } });
    await VideoService.end('journey-1');
    expect(mocked.post).toHaveBeenCalledWith('/video/end', { journeyId: 'journey-1' });
  });

  it('joins through POST /video/call-token and propagates errors instead of mock tokens', async () => {
    mocked.post.mockResolvedValue({ data: { meetingUrl: 'https://meet.example', provider: 'jitsi' } });
    const join = await VideoService.join('journey-1');
    expect(mocked.post).toHaveBeenCalledWith('/video/call-token', { journeyId: 'journey-1' });
    expect(join.meetingUrl).toBe('https://meet.example');

    mocked.get.mockRejectedValue(new Error('403'));
    await expect(VideoService.getSession('journey-1')).rejects.toThrow('403');
  });
});

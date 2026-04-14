import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch(WsException)
export class WsExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: WsException, host: ArgumentsHost) {
    const client: Socket = host.switchToWs().getClient();
    const error = exception.getError();
    client.emit('error', {
      status: 'error',
      message: typeof error === 'string' ? error : (error as any)?.message || '發生未知錯誤',
    });
  }
}

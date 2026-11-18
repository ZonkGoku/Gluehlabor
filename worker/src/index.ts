import { handle, type Env } from './app';

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handle(request, env);
  },
};

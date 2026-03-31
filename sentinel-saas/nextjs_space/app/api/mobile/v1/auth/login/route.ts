import { z } from 'zod';
import { mobileError, mobileOk } from '@/lib/mobile-response';
import { signMobileTokens, validateCredentials } from '@/lib/mobile-auth';

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json());
    const user = await validateCredentials(body.email, body.password);
    if (!user) {
      return mobileError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }
    const tokens = signMobileTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    return mobileOk({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      ...tokens,
    });
  } catch {
    return mobileError('BAD_REQUEST', 'Invalid request payload', 400);
  }
}


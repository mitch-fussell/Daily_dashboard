import { signIn } from '@/auth';
import { Button } from '@/components/ui/button';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Personal Dashboard</h1>
          <p className="text-gray-400 mt-1 text-sm">Sign in to continue</p>
        </div>
        <form
          action={async () => {
            'use server';
            await signIn('github', { redirectTo: '/' });
          }}
        >
          <Button type="submit" className="w-full">
            Sign in with GitHub
          </Button>
        </form>
      </div>
    </div>
  );
}

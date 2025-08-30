import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link, Form } from "@remix-run/react";
import { requireUser } from "~/utils/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  return json({ user });
}

export default function Dashboard() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <img className="h-8 w-auto" src="/logo-light.png" alt="Momentum" />
              <h1 className="ml-3 text-xl font-semibold text-gray-900">Developer Productivity Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {user.fullName || user.email}</span>
              <Form action="/logout" method="post">
                <button type="submit" className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Sign Out
                </button>
              </Form>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-900">Welcome to Momentum</h2>
              <p className="mt-4 text-lg text-gray-600">Your developer productivity platform is ready to use.</p>

              <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900">Organization</h3>
                    <p className="mt-2 text-sm text-gray-600">{user.tenant.name}</p>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900">Role</h3>
                    <p className="mt-2 text-sm text-gray-600">{user.role === "ADMIN" ? "Administrator" : "Viewer"}</p>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900">Status</h3>
                    <p className="mt-2 text-sm text-green-600">Active</p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  to={`/onboarding/data-sources?tenant=${user.tenantId}`}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Continue Onboarding
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export function meta() {
  return [{ title: "Momentum" }, { name: "description", content: "Developer productivity analytics" }];
}

export default function Home() {
  return (
    <main className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Momentum</h1>
        <p className="text-gray-600 dark:text-gray-400">Developer productivity analytics</p>
      </div>
    </main>
  );
}

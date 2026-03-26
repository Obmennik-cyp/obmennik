"use client";

import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#020b22] flex items-center justify-center text-white">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">Админ панель</h1>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => router.push("/admin/staff")}
            className="bg-blue-600 px-6 py-3 rounded"
          >
            Сотрудники
          </button>

          <button
            onClick={() => router.push("/admin/rates")}
            className="bg-green-600 px-6 py-3 rounded"
          >
            Курсы
          </button>
        </div>
      </div>
    </main>
  );
}
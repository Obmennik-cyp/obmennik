"use client";

import { useEffect, useState } from "react";

type User = {
  id: number;
  email: string;
  role: string;
  permissions: string[] | string;
};

type Template = {
  id: number;
  title: string;
  content: string;
};

export default function TelegramPage() {
  const [user, setUser] = useState<User | null>(null);
  const [text, setText] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateTitle, setTemplateTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [message, setMessage] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("user");
    if (!saved) {
      window.location.href = "/login";
      return;
    }

    setUser(JSON.parse(saved));
  }, []);

  const handleImageChange = (file: File | null) => {
    if (!file) return;

    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const sendMessage = async () => {
    if (!user) return;

    try {
      setMessage("");

      const formData = new FormData();
      formData.append("text", text);

      if (image) {
        formData.append("image", image);
      }

      const res = await fetch("/api/telegram", {
        method: "POST",
        headers: {
          "x-user": JSON.stringify(user),
        },
        body: formData,
      });

      const data = await res.json();

      if (!data.success) {
        setMessage(data.message || "Ошибка");
        return;
      }

      setMessage("Сообщение отправлено ✅");
      setText("");
      setImage(null);
      setPreview(null);
    } catch {
      setMessage("Ошибка отправки");
    }
  };

  const saveTemplate = () => {
    if (!templateTitle || !text) {
      setMessage("Заполни название и текст");
      return;
    }

    const newTemplate = {
      id: Date.now(),
      title: templateTitle,
      content: text,
    };

    const updated = [...templates, newTemplate];
    setTemplates(updated);
    localStorage.setItem("tg_templates", JSON.stringify(updated));

    setTemplateTitle("");
    setMessage("Шаблон сохранён ✅");
  };

  const loadTemplate = (tpl: Template) => {
    setText(tpl.content);
  };

  useEffect(() => {
    const saved = localStorage.getItem("tg_templates");
    if (saved) {
      setTemplates(JSON.parse(saved));
    }
  }, []);

  return (
    <main className="min-h-screen bg-[#020b22] px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-4xl font-bold">Telegram сообщения</h1>

        <div className="rounded-2xl border border-white/10 bg-[#0b1628] p-6">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Введите сообщение..."
            className="w-full h-40 rounded-xl bg-white/10 p-4 outline-none"
          />

          {/* 📸 загрузка */}
          <div className="mt-4">
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                handleImageChange(e.target.files?.[0] || null)
              }
            />

            {preview && (
              <div className="mt-3">
                <img
                  src={preview}
                  alt="preview"
                  className="max-h-40 rounded-xl"
                />
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <button
              onClick={sendMessage}
              className="rounded-xl bg-blue-600 px-4 py-3"
            >
              Отправить в Telegram
            </button>

            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="rounded-xl bg-white/10 px-4 py-3"
            />
          </div>

          {message && (
            <div className="mt-4 bg-white/10 p-3 rounded-xl">
              {message}
            </div>
          )}

          <div className="mt-6 border-t border-white/10 pt-6">
            <h2 className="mb-3 text-xl">Шаблоны</h2>

            <input
              value={templateTitle}
              onChange={(e) => setTemplateTitle(e.target.value)}
              placeholder="Название шаблона"
              className="mb-3 w-full rounded-xl bg-white/10 px-4 py-3"
            />

            <button
              onClick={saveTemplate}
              className="mb-4 rounded-xl bg-green-600 px-4 py-3"
            >
              Сохранить как шаблон
            </button>

            <div className="space-y-2">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="flex justify-between bg-white/5 p-3 rounded-xl"
                >
                  <span>{tpl.title}</span>
                  <button onClick={() => loadTemplate(tpl)}>
                    Использовать
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
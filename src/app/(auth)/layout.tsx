import { Think } from "ui/think";
import { getTranslations } from "next-intl/server";
import { FlipWords } from "ui/flip-words";
import { VyshyvankaOrnament } from "ui/vyshyvanka-ornament";

export default async function AuthLayout({
  children,
}: { children: React.ReactNode }) {
  const t = await getTranslations("Auth.Intro");
  return (
    <main className="relative w-full flex flex-col h-screen">
      <div className="flex-1">
        <div className="flex min-h-screen w-full">
          <div className="hidden lg:flex lg:w-1/2 border-r flex-col relative overflow-hidden">
            <div className="absolute inset-0 w-full h-full">
              <VyshyvankaOrnament />
            </div>
            <div className="relative z-10 flex flex-col flex-1 p-18">
              <h1 className="text-xl font-semibold flex items-center gap-3 animate-in fade-in duration-1000">
                <Think />

                <span>Еней 1</span>
              </h1>
              <div className="flex-1" />
              <FlipWords
                words={[t("description")]}
                className=" mb-4 text-muted-foreground"
              />
            </div>
          </div>

          <div className="w-full lg:w-1/2 p-6">{children}</div>
        </div>
      </div>
    </main>
  );
}

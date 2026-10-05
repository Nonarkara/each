import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../lib/languageContext";
import { Btn, Input } from "./ui/Axiom";
export function QuickNavigation({
  onNavigate,
}: {
  onNavigate: (route: string) => void;
}) {
  const { t } = useLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const searchLabel = useRef<HTMLLabelElement>(null);
  const [query, setQuery] = useState("");
  function open() {
    setQuery("");
    dialog.current?.showModal();
    searchLabel.current?.querySelector("input")?.focus();
  }
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setQuery("");
        dialog.current?.showModal();
        searchLabel.current?.querySelector("input")?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const routes = [
    ["erp", "ERP Finance cash runway การเงิน เงินสด"],
    ["act", "ACT Accounting expenses actions บัญชี รายจ่าย งาน"],
    ["crm", "CRM Customers deals pipeline ลูกค้า โครงการ"],
    ["hr", "HR People payroll ทีม เงินเดือน"],
    ["intake", "Documents AI PDF Hippocampus เอกสาร หลักฐาน"],
    ["mirrors", "Mirrors Excel Sheets สำเนาข้อมูล ชีต"],
    ["security", "Security backups recovery ความปลอดภัย สำรอง กู้คืน"],
    ["dossier", "Dossier investor summary สรุป นักลงทุน"],
  ];
  const names: Record<string, string> = {
    erp: t("ERP · Finance", "ERP · การเงิน"),
    act: t("ACT · Accounting & actions", "ACT · บัญชีและงาน"),
    crm: t("CRM · Customers", "CRM · ลูกค้า"),
    hr: t("HR · People", "HR · ทีม"),
    intake: t("Documents & Hippocampus", "เอกสารและ Hippocampus"),
    mirrors: t("Data mirrors", "สำเนาข้อมูล"),
    security: t("Security Center", "ศูนย์ความปลอดภัย"),
    dossier: t("Company dossier", "สรุปข้อมูลบริษัท"),
  };
  const results = routes.filter(([, keywords]) =>
    query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .every((word) => keywords.toLowerCase().includes(word)),
  );
  function choose(route: string) {
    dialog.current?.close();
    onNavigate(route);
  }
  return (
    <>
      <Btn variant="ghost" onClick={open}>
        {t("Find", "ค้นหา")} <span className="ml-2 hidden font-mono text-[11px] sm:inline">⌘K</span>
      </Btn>
      <dialog
        ref={dialog}
        aria-label={t("Find a workspace tool", "ค้นหาเครื่องมือพื้นที่ทำงาน")}
        className="fixed inset-0 m-auto w-[min(560px,90vw)] max-h-[85vh] overflow-auto border border-line-2 bg-panel p-4 text-ink backdrop:bg-ink/40"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-[14px] font-bold">
            {t("Where do you want to go?", "ต้องการไปที่ไหน?")}
          </h2>
          <Btn variant="ghost" onClick={() => dialog.current?.close()}>
            {t("Close", "ปิด")}
          </Btn>
        </div>
        <label ref={searchLabel}>
          {t(
            "Search tools in Thai or English",
            "ค้นหาเครื่องมือด้วยภาษาไทยหรืออังกฤษ",
          )}
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results.length) {
                e.preventDefault();
                choose(results[0][0]);
              }
            }}
          />
        </label>
        <div className="mt-3 grid gap-px border border-line bg-line">
          {results.map(([route]) => (
            <Btn key={route} variant="ghost" onClick={() => choose(route)}>
              {names[route]}
            </Btn>
          ))}
        </div>
        {!results.length ? (
          <p className="mt-3">
            {t(
              "No matching tools. Try “cash”, “PDF” or “security”.",
              "ไม่พบเครื่องมือ ลอง “เงินสด” “PDF” หรือ “ความปลอดภัย”",
            )}
          </p>
        ) : null}
      </dialog>
    </>
  );
}

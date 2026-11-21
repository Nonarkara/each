import { useLanguage } from '../../lib/languageContext'
import { useCopy } from '../../lib/copy'
import { admit, contrastRatio, formatRatio, mix } from '../../lib/color'
import {
  Btn,
  DataTable,
  Meter,
  SectionHead,
  Station,
  TagChip,
} from '../../components/ui/Axiom'

const PAPER = '#f6f5f2'
const INK = '#191712'
const INK2 = '#5f5b52'
const AMBER = '#f59e0b'

/**
 * THE PALETTE, AS A SCALE.
 *
 * The system is a closed palette: six neutrals that carry, and one point
 * that interrupts. This screen shows the neutrals as the scale they are — one
 * continuous run from the deep shade to the light ground — and the amber
 * standing apart from it, because an accent that sits inside the ramp is not
 * an accent.
 *
 * It then shows the pairs the system allows, with the measured contrast, and
 * the components the system is actually built from, drawn in the system
 * itself. A design system nobody can see is a list of opinions. A design
 * system that is a screen is a thing a founder can read, argue with, and hand
 * to the person who builds their next thing.
 */
export function DesignModule() {
  const copy = useCopy()
  const { t } = useLanguage()

  // The scale, dark to light. The order is the order of value, and every
  // neutral in the system is on it.
  const scale = [
    { name: 'ink', hex: '#191712', job: t('The voice', 'เสียงหลัก') },
    { name: 'ink-2', hex: '#5f5b52', job: t('The second voice', 'เสียงรอง') },
    { name: 'rule', hex: '#cfcbc0', job: t('2px — a boundary between steps', '2px — เส้นคั่นขั้นตอน') },
    { name: 'hairline', hex: '#e4e1d8', job: t('1px — between peers', '1px — ระหว่างข้อมูลระดับเดียวกัน') },
    { name: 'panel', hex: '#ffffff', job: t('A raised surface', 'พื้นยกระดับ') },
    { name: 'paper', hex: '#f6f5f2', job: t('The page', 'พื้นหน้า') },
  ]

  // The point. It is not on the scale, and that is the point.
  const accent = { name: 'amber', hex: '#f59e0b', job: t('The one interruption', 'จุดเดียวที่ขัดจังหวะ') }

  const combinations = [
    { ground: '#f6f5f2', text: '#191712', pair: 'paper → ink', note: t('The reading pair. 16.4:1', 'คู่อ่านหลัก 16.4:1') },
    { ground: '#ffffff', text: '#5f5b52', pair: 'panel → ink-2', note: t('Labels on a raised surface. 6.8:1', 'ป้ายบนพื้นยก 6.8:1') },
    { ground: '#191712', text: '#f6f5f2', pair: 'ink → paper', note: t('The inverted pair. 16.4:1', 'คู่กลับสี 16.4:1') },
    { ground: '#191712', text: '#f59e0b', pair: 'ink → amber', note: t('The point on the deep shade. 8.3:1', 'จุดเน้นบนเฉดลึก 8.3:1') },
    { ground: '#f59e0b', text: '#191712', pair: 'amber → ink', note: t('Ink on the point. 8.3:1', 'ตัวอักษรบนจุดเน้น 8.3:1') },
  ]

  /* SHADES AND LIGHTS.
   *
   * The palette is closed, but a system that cannot grow is a photograph of a
   * system. So the system states the rule by which it grows: a tone enters
   * as a SHADE of a colour already in the palette (a mix toward ink) or a
   * LIGHT of one (a mix toward paper). Value moves; hue does not. A new hue
   * would need the accent slot, and there is one accent slot.
   *
   * Every tone below is measured on the ground it is meant to stand on, and
   * the measurement says what it earns: body text, a rule or a number, a
   * fill, or nothing at all. The screen does not decide; it shows what the
   * arithmetic decides, which is the only kind of decision a screen can
   * make honestly.
   */
  const tones = [
    {
      name: 'ink-2 · shade',
      recipe: t('ink-2 mixed 40% toward ink', 'ink-2 ผสม 40% เข้าหาเฉดลึก'),
      hex: mix(INK2, INK, 0.4),
      ground: PAPER,
    },
    {
      name: 'ink-2 · light',
      recipe: t('ink-2 mixed 35% toward paper', 'ink-2 ผสม 35% เข้าหากระดาษ'),
      hex: mix(INK2, PAPER, 0.35),
      ground: PAPER,
    },
    {
      name: 'ink-2 · wash',
      recipe: t('ink-2 mixed 75% toward paper', 'ink-2 ผสม 75% เข้าหากระดาษ'),
      hex: mix(INK2, PAPER, 0.75),
      ground: PAPER,
    },
    {
      name: 'amber · light',
      recipe: t('amber mixed 78% toward paper', 'amber ผสม 78% เข้าหากระดาษ'),
      hex: mix(AMBER, PAPER, 0.78),
      ground: PAPER,
    },
    {
      name: 'amber · shade',
      recipe: t('amber mixed 35% toward ink', 'amber ผสม 35% เข้าหาเฉดลึก'),
      hex: mix(AMBER, INK, 0.35),
      ground: PAPER,
    },
    {
      name: 'paper · dim',
      recipe: t('paper mixed 18% toward ink', 'กระดาษผสม 18% เข้าหาเฉดลึก'),
      hex: mix(PAPER, INK, 0.18),
      ground: INK,
    },
  ].map((tone) => {
    const onPaper = contrastRatio(tone.hex, PAPER)
    const onInk = contrastRatio(tone.hex, INK)
    const earned = admit(contrastRatio(tone.hex, tone.ground))
    return {
      ...tone,
      onPaper,
      onInk,
      earned,
      // The colour that may be written ON this tone: the one that clears
      // body text against it. When nothing does, the ground's own light is
      // used and the tone is shown as a fill, not a surface for words.
      text: contrastRatio(tone.hex, INK) >= 4.5 ? INK : PAPER,
    }
  })

  const admissionLabel: Record<string, string> = {
    body: t('As text on this ground — 4.5:1 or better', 'เป็นตัวอักษรบนพื้นนี้ — 4.5:1 ขึ้นไป'),
    large: t('As a number, a rule or an edge — 3:1 or better', 'เป็นตัวเลข เส้น หรือขอบ — 3:1 ขึ้นไป'),
    fill: t('As a ground or a wash — never as text', 'เป็นพื้นหรือฝังสี — ห้ามใช้เป็นตัวอักษร'),
    none: t('Not legible as text on this ground', 'อ่านไม่ออกถ้าเป็นตัวอักษรบนพื้นนี้'),
  }

  const Ramp = ({ r, isPoint }: { r: { name: string; hex: string; job: string }; isPoint?: boolean }) => (
    <div className={`flex items-center gap-3 lg:block ${isPoint ? 'mt-1 lg:mt-0 lg:ml-5' : ''}`}>
      <span
        className="block h-10 w-10 shrink-0 border border-paper/25 lg:h-16 lg:w-full"
        style={{ background: r.hex }}
        aria-hidden
      />
      <span className="min-w-0 lg:mt-2 lg:block">
        <span className="block font-mono text-[14px] text-paper">{r.name}</span>
        <span className="block font-mono text-[11px] text-paper/70">{r.hex}</span>
        <span className="block text-[11px] text-paper/70">{r.job}</span>
      </span>
    </div>
  )

  return (
    <div>
      <Station
        disc="D"
        title={copy("Design system")}
        meta={t('Closed palette · 3 sizes · 1 accent', 'ชุดสีปิด · 3 ขนาด · 1 สีเน้น')}
      />

      {/* THE ONE FIELD. The whole palette at once: the neutrals as one
          continuous scale, and the amber standing apart from the scale it
          interrupts. On the deep shade, in the palette's own light — the
          system showing itself. */}
      <div className="mb-6 bg-ink p-5 sm:p-6">
        <p className="text-[11px] text-paper">{t('The scale', 'สเกล')}</p>
        <p className="mt-1 font-display text-[32px] font-bold leading-none text-paper">
          {t('6 neutrals, 1 point', '6 น้ำเงินเข้ม 1 จุดเน้น')}
        </p>
        <p className="mt-2 font-mono text-[14px] text-paper">
          #191712 → #f6f5f2
        </p>
        <div className="mt-5 grid grid-cols-1 gap-x-3 gap-y-3 lg:grid-cols-7">
          {scale.map((r) => (
            <Ramp key={r.name} r={r} />
          ))}
          <Ramp r={accent} isPoint />
        </div>
      </div>

      {/* The pairs the system allows. Each one is drawn in itself, with the
          measured contrast beside it, so the rule can be checked rather than
          believed. */}
      <div className="mb-6">
        <SectionHead label={t('Allowed pairs', 'คู่ที่ใช้ได้')} meta={t('measured on this ground', 'วัดบนพื้นนี้')} />
        <div className="grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-5">
          {combinations.map((c, i) => (
            <div
              key={c.pair}
              /* Five pairs divide by five. Below that the last pair takes the
                 whole row, so the grid never ends on an empty cell. */
              className={`bg-panel p-3 ${i === combinations.length - 1 ? 'sm:col-span-2 lg:col-span-1' : ''}`}
            >
              <div
                className="flex h-16 items-center justify-center border border-hairline"
                style={{ background: c.ground }}
              >
                <span
                  className="font-display text-[14px] font-bold"
                  style={{ color: c.text }}
                >
                  {t('Aa', 'Aa')} 43,182
                </span>
              </div>
              <p className="mt-2 font-mono text-[11px] text-ink-2">{c.pair}</p>
              <p className="text-[11px] text-ink-2">{c.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* SHADES AND LIGHTS. The rule by which the palette grows, and the
          tones that rule admits — each one measured on the ground it stands
          on, with the use its measurement earns. */}
      <div className="mb-6">
        <SectionHead
          label={t('Shades and lights', 'เฉดแสงและแสงอ่อน')}
          meta={t('measured, not asserted', 'วัดจริง ไม่ใช่คำบอกกล่าว')}
        />
        <p className="mb-3 max-w-[65ch] text-[14px] text-ink-2">
          {t(
            'A tone enters as a shade of a colour already in it, or a light of one: value moves, hue does not. What it may then do is decided by the measured number beside it.',
            'เฉดใหม่เข้าสู่ระบบได้ด้วยการเป็นเฉดเข้มหรือแสงอ่อนของสีที่มีอยู่แล้ว เปลี่ยนค่า ไม่เปลี่ยนเฉดสี สิทธิ์ที่จะใช้ทำอะไรต่อไปให้ตัวเลขที่วัดไว้เป็นผู้ตัดสิน',
          )}
        </p>
        <p className="mb-3 max-w-[65ch] text-[14px] text-ink-2">
          {t(
            'A new hue would need the accent slot, and there is one accent slot.',
            'สีใหม่ที่ต้องใช้ช่องสีเน้น ซึ่งมีเพียงช่องเดียว',
          )}
        </p>
        <div className="grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3">
          {tones.map((tone) => (
            <div key={tone.name} className="bg-panel p-3">
              <div
                className="flex h-16 items-center justify-center border border-hairline"
                style={{ background: tone.hex }}
              >
                <span className="font-display text-[14px] font-bold" style={{ color: tone.text }}>
                  {t('Aa', 'Aa')} 43,182
                </span>
              </div>
              <p className="mt-2 font-mono text-[14px] text-ink">{tone.name}</p>
              <p className="text-[11px] text-ink-2">{tone.recipe}</p>
              <p className="font-mono text-[11px] text-ink-2">{tone.hex}</p>
              <p className="mt-1 font-mono text-[11px] text-ink">
                {t('on paper', 'บนกระดาษ')} {formatRatio(tone.onPaper)} · {t('on ink', 'บนเฉดลึก')}{' '}
                {formatRatio(tone.onInk)}
              </p>
              <p className="text-[11px] text-ink-2">{admissionLabel[tone.earned]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* The components the system is built from, drawn in the system. A
          design system you cannot see is a list of opinions. */}
      <div className="mb-6">
        <SectionHead label={t('Components', 'คอมโพเนนต์')} />
        {/* Two columns only when both columns can carry their own weight. At
            a laptop width the specimens stack instead, because a specimen
            beside a hole is a worse specimen than a taller page. */}
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="min-w-0">
            <h4 className="mb-2 text-[11px] text-ink-2">{t('Buttons', 'ปุ่ม')}</h4>
            <div className="flex flex-wrap items-center gap-2">
              <Btn>{copy('Primary')}</Btn>
              <Btn variant="ghost">{copy('Secondary')}</Btn>
              <Btn variant="link">{copy('Link')}</Btn>
            </div>
            <h4 className="mb-2 mt-4 text-[11px] text-ink-2">{t('Chips', 'ป้าย')}</h4>
            <div className="flex flex-wrap items-center gap-2">
              <TagChip>{t('Default', 'ปกติ')}</TagChip>
              <TagChip tone="amber">{t('Amber', 'เน้น')}</TagChip>
              <TagChip tone="human">{t('Human', 'คน')}</TagChip>
              <TagChip tone="ai">{t('AI', 'AI')}</TagChip>
            </div>
            <h4 className="mb-2 mt-4 text-[11px] text-ink-2">{t('A meter', 'แถบวัด')}</h4>
            <Meter
              segments={[
                { label: t('Received', 'รับแล้ว'), value: '43,182', pct: 25, variant: 'ink' },
                { label: t('Outstanding', 'ลูกหนี้ค้าง'), value: '10,916,009', pct: 55, variant: 'amber' },
                { label: t('Expected', 'คาดหวัง'), value: '1,877,910', pct: 20, variant: 'muted' },
              ]}
            />
          </div>
          <div className="min-w-0">
            <h4 className="mb-2 text-[11px] text-ink-2">{t('A table', 'ตาราง')}</h4>
            <DataTable minWidth={320} stack={false}>
              <thead>
                <tr className="border-b border-hairline font-body text-[11px] text-ink-2">
                  <th className="py-2 pr-3 text-left">{t('Lender', 'ผู้ให้กู้')}</th>
                  <th className="py-2 pr-3 text-right">{t('Principal', 'เงินต้น')}</th>
                  <th className="py-2 text-right">{t('Rate', 'ดอกเบี้ย')}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-hairline">
                  <td className="py-2 pr-3 text-[14px]">{t('Bank overdraft', 'วงเงินครอบเงินฝาก')}</td>
                  <td className="py-2 pr-3 text-right font-mono text-[14px]">3,539,650</td>
                  <td className="py-2 text-right font-mono text-[14px]">0%</td>
                </tr>
              </tbody>
            </DataTable>
            <h4 className="mb-2 mt-4 text-[11px] text-ink-2">{t('Type', 'ตัวอักษร')}</h4>
            <p className="font-display text-[32px] font-bold leading-none">{t('Display 32', 'แสดงผล 32')}</p>
            <p className="mt-1 text-[14px]">{t('Body 14', 'เนื้อหา 14')}</p>
            <p className="text-[11px] text-ink-2">{t('Micro 11 — labels, units, facts', 'เล็ก 11 — ป้าย หน่วย ข้อมูล')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

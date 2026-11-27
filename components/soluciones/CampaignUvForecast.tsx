import type { CampaignBlock } from "../../lib/soluciones/campaign-content";
import { summarizeMetUv, type MetUvSeries } from "../../lib/soluciones/met-uv";
import CampaignUvPremium, { type UvReading } from "./CampaignUvPremium";

type Block = Extract<CampaignBlock, { type: "uv-forecast" }>;

const simulatedReading: UvReading = {
  current: 7.2, max: 9.4, hour: "13:00", updated: "",
  chart: [{ at: "12:00", hour: "12:00", value: 6.2 }, { at: "13:00", hour: "13:00", value: 7.2 }, { at: "14:00", hour: "14:00", value: 9.4 }, { at: "15:00", hour: "15:00", value: 8.1 }],
};

export default function CampaignUvForecast({ block, forecast, asOf, preview = false, token }: {
  block: Block; forecast?: MetUvSeries; asOf?: string; preview?: boolean; token?: string;
}) {
  const mode = block.locationMode ?? "fixed";
  const view = forecast && asOf && mode !== "mobile" ? summarizeMetUv(forecast, block.timezone, new Date(asOf)) : null;
  const clock = new Intl.DateTimeFormat("es-CL", { timeZone: block.timezone, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  const hour = new Intl.DateTimeFormat("es-CL", { timeZone: block.timezone, hour: "2-digit", minute: "2-digit" });
  const reading = preview ? simulatedReading : view && forecast ? {
    current: view.current, max: view.max, hour: view.current == null ? "-" : hour.format(new Date(asOf ?? "")),
    updated: clock.format(new Date(forecast.updatedAt)),
    chart: view.chart.map(sample => ({ at: sample.at, hour: hour.format(new Date(sample.at)), value: sample.value })),
  } : undefined;
  return <CampaignUvPremium title={block.title} mode={mode} reading={reading} preview={preview} token={token} timezone={block.timezone} />;
}

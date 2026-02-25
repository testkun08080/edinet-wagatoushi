# 四半期データのグラフ化 - Chart.js + react-chartjs-2

各四半期の売上高・営業利益・経常利益などを折れ線グラフで可視化するために **Chart.js + react-chartjs-2** を使用します。

---

## 導入

```bash
npm install chart.js react-chartjs-2
```

---

## 使用例（四半期折れ線グラフ）

```tsx
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const chartData = {
  labels: periods.map((p) => p.periodEnd),
  datasets: [
    {
      label: "売上高（百万円）",
      data: periods.map((p) => Number(p.summary?.["売上高"] ?? 0) / 1_000_000),
      borderColor: "rgb(59, 130, 246)",
      backgroundColor: "rgba(59, 130, 246, 0.1)",
    },
    {
      label: "営業利益（百万円）",
      data: periods.map((p) => Number(p.pl?.["営業利益"] ?? 0) / 1_000_000),
      borderColor: "rgb(16, 185, 129)",
      backgroundColor: "rgba(16, 185, 129, 0.1)",
    },
  ],
};

<Line
  data={chartData}
  options={{
    responsive: true,
    plugins: { legend: { position: "top" } },
    scales: {
      y: { beginAtZero: true },
    },
  }}
/>;
```

---

## 参考

- [Chart.js ドキュメント](https://www.chartjs.org/docs/latest/)
- [react-chartjs-2](https://react-chartjs-2.js.org/)

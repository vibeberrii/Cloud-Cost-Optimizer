import { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import "./App.css";

const defaultResources = [
  { provider: "AWS", name: "EC2-001", type: "Virtual Machine", cost: 120, usage: 10 },
  { provider: "AWS", name: "EC2-002", type: "Virtual Machine", cost: 200, usage: 90 },
  { provider: "Azure", name: "Storage-01", type: "Storage", cost: 80, usage: 15 },
  { provider: "GCP", name: "DB-Prod", type: "Database", cost: 250, usage: 35 },
  { provider: "AWS", name: "LoadBalancer-01", type: "Networking", cost: 60, usage: 8 },
];

function App() {
  const [resources, setResources] = useState(() => {
    const savedResources = localStorage.getItem("cloudResources");
    return savedResources ? JSON.parse(savedResources) : defaultResources;
  });

  const [form, setForm] = useState({
    provider: "AWS",
    name: "",
    type: "Virtual Machine",
    cost: "",
    usage: "",
  });

  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);

  const [instanceType, setInstanceType] = useState("t3.micro");
  const [region, setRegion] = useState("us-east-1");

  const awsPrices = {
    "t3.micro": 0.0104,
    "t3.small": 0.0208,
    "t3.medium": 0.0416,
    "t3.large": 0.0832,
  };

  const hourlyCost = awsPrices[instanceType];
  const monthlyCost = (hourlyCost * 730).toFixed(2);

  useEffect(() => {
    localStorage.setItem("cloudResources", JSON.stringify(resources));
  }, [resources]);

  const totalCost = resources.reduce((sum, item) => sum + Number(item.cost), 0);

  const savings = useMemo(() => {
    return resources
      .filter((item) => Number(item.usage) < 20)
      .reduce((sum, item) => sum + Number(item.cost) * 0.5, 0);
  }, [resources]);

  const idleResources = resources.filter((item) => Number(item.usage) < 20).length;

  const chartData = resources.map((item) => ({
    name: `${item.provider || "AWS"} - ${item.name}`,
    value: Number(item.cost),
  }));

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addResource = (e) => {
    e.preventDefault();

    if (!form.name || !form.cost || !form.usage) {
      alert("Please fill all fields");
      return;
    }

    setResources([
      ...resources,
      {
        provider: form.provider,
        name: form.name,
        type: form.type,
        cost: Number(form.cost),
        usage: Number(form.usage),
      },
    ]);

    setForm({
      provider: "AWS",
      name: "",
      type: "Virtual Machine",
      cost: "",
      usage: "",
    });

    setAnalysis("");
  };

  const addCalculatedEC2 = () => {
    const newResource = {
      provider: "AWS",
      name: `EC2-${instanceType}`,
      type: "Virtual Machine",
      cost: Number(monthlyCost),
      usage: 25,
    };

    setResources([...resources, newResource]);
    setAnalysis("");
  };

  const deleteResource = (name) => {
    setResources(resources.filter((item) => item.name !== name));
    setAnalysis("");
  };

  const resetResources = () => {
    setResources(defaultResources);
    setAnalysis("");
  };

  const analyzeCosts = async () => {
    try {
      setLoading(true);
      setAnalysis("");

      const response = await fetch("http://localhost:5000/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resources }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI analysis failed");
      }

      setAnalysis(data.analysis || "No analysis returned.");
    } catch (error) {
      setAnalysis("Something went wrong. Check backend and Gemini API key.");
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!analysis) {
      alert("Generate AI analysis first");
      return;
    }

    const report = `
Cloud Cost Optimizer Report

Total Monthly Cost: $${totalCost}
Potential Savings: $${savings.toFixed(0)}
Idle Resources: ${idleResources}
Resources Analyzed: ${resources.length}

Cloud Resources:
${resources
  .map(
    (item) =>
      `- ${item.provider} | ${item.name} | ${item.type} | Cost: $${item.cost} | Usage: ${item.usage}%`
  )
  .join("\n")}

AI Analysis:
${analysis}
`;

    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "cloud-cost-report.txt";
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="container">
      <div className="hero">
        <p className="badge">AI Powered Multi-Cloud FinOps Tool</p>
        <h1>☁️ Cloud Cost Optimizer</h1>
        <p className="subtitle">
          Analyze AWS, Azure, and GCP resources, detect idle infrastructure,
          estimate wasted spend, and generate AI-powered saving recommendations.
        </p>
      </div>

      <div className="cards">
        <div className="card">
          <h3>Total Monthly Cost</h3>
          <p>${totalCost}</p>
        </div>

        <div className="card success">
          <h3>Potential Savings</h3>
          <p>${savings.toFixed(0)}</p>
        </div>

        <div className="card warning">
          <h3>Idle Resources</h3>
          <p>{idleResources}</p>
        </div>

        <div className="card">
          <h3>Resources Analyzed</h3>
          <p>{resources.length}</p>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2>Add Cloud Resource</h2>
          <button className="reset-btn" onClick={resetResources}>
            Reset Demo Data
          </button>
        </div>

        <form className="resource-form" onSubmit={addResource}>
          <select name="provider" value={form.provider} onChange={handleChange}>
            <option>AWS</option>
            <option>Azure</option>
            <option>GCP</option>
          </select>

          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Resource Name"
          />

          <select name="type" value={form.type} onChange={handleChange}>
            <option>Virtual Machine</option>
            <option>Storage</option>
            <option>Database</option>
            <option>Networking</option>
            <option>Kubernetes</option>
          </select>

          <input
            name="cost"
            type="number"
            value={form.cost}
            onChange={handleChange}
            placeholder="Monthly Cost"
          />

          <input
            name="usage"
            type="number"
            value={form.usage}
            onChange={handleChange}
            placeholder="Usage %"
          />

          <button type="submit">Add Resource</button>
        </form>
      </div>

      <div className="section">
        <h2>AWS EC2 Cost Calculator</h2>

        <div className="calculator-grid">
          <div>
            <label>Instance Type</label>
            <select value={instanceType} onChange={(e) => setInstanceType(e.target.value)}>
              <option value="t3.micro">t3.micro</option>
              <option value="t3.small">t3.small</option>
              <option value="t3.medium">t3.medium</option>
              <option value="t3.large">t3.large</option>
            </select>
          </div>

          <div>
            <label>Region</label>
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="us-east-1">us-east-1</option>
              <option value="us-west-2">us-west-2</option>
              <option value="eu-west-1">eu-west-1</option>
            </select>
          </div>
        </div>

        <div className="cost-card">
          <h3>Estimated Monthly Cost</h3>
          <p>${monthlyCost}</p>
          <small>
            {instanceType} in {region}, based on 730 hours/month
          </small>
        </div>

        <button className="add-calculated-btn" onClick={addCalculatedEC2}>
          Add This EC2 Estimate To Resources
        </button>
      </div>

      <div className="section">
        <h2>Cloud Resources</h2>

        <table>
          <thead>
            <tr>
              <th>Provider</th>
              <th>Resource</th>
              <th>Type</th>
              <th>Monthly Cost</th>
              <th>Usage</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {resources.map((item) => (
              <tr key={`${item.provider}-${item.name}`}>
                <td>
                  <span className="provider-badge">{item.provider || "AWS"}</span>
                </td>
                <td>{item.name}</td>
                <td>{item.type}</td>
                <td>${item.cost}</td>
                <td>{item.usage}%</td>
                <td>
                  <span className={item.usage < 20 ? "status idle" : "status active"}>
                    {item.usage < 20 ? "Underused" : "Healthy"}
                  </span>
                </td>
                <td>
                  <button className="delete-btn" onClick={() => deleteResource(item.name)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="chart">
        <h2>Cost Breakdown</h2>

        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie data={chartData} dataKey="value" outerRadius={115} label>
              {chartData.map((entry, index) => (
                <Cell key={index} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <button className="analyze-btn" onClick={analyzeCosts} disabled={loading}>
        {loading ? "Analyzing..." : "Analyze Costs With AI"}
      </button>

      {analysis && (
        <button className="export-btn" onClick={exportReport}>
          Export AI Report
        </button>
      )}

      {analysis && (
        <div className="analysis-box">
          <h2>AI Cost Analysis</h2>
          <div className="analysis-content">{analysis}</div>
        </div>
      )}
    </div>
  );
}

export default App;
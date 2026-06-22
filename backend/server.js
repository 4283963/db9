const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const cabinetCount = 5;

function generateTemps() {
  const temps = [];
  for (let i = 0; i < cabinetCount; i++) {
    const temp = (20 + Math.random() * 25).toFixed(1);
    temps.push({
      id: i + 1,
      name: `机柜 ${i + 1}`,
      temperature: temp,
      status: temp > 40 ? 'danger' : (temp > 32 ? 'warning' : 'normal')
    });
  }
  return temps;
}

app.get('/api/cabinets/temps', (req, res) => {
  res.json({
    success: true,
    data: generateTemps(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/cabinets/:id/temp', (req, res) => {
  const id = parseInt(req.params.id);
  if (id < 1 || id > cabinetCount) {
    return res.status(404).json({ success: false, message: '机柜不存在' });
  }
  const temp = (20 + Math.random() * 25).toFixed(1);
  res.json({
    success: true,
    data: {
      id,
      name: `机柜 ${id}`,
      temperature: temp,
      status: temp > 40 ? 'danger' : (temp > 32 ? 'warning' : 'normal')
    },
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`);
  console.log(`温度接口: http://localhost:${PORT}/api/cabinets/temps`);
});

export function calculateBmi(heightCm: number, weightKg: number) {
  const heightMeter = heightCm / 100;
  const bmi = weightKg / (heightMeter * heightMeter);
  return Number(bmi.toFixed(2));
}

export function getBmiCategory(bmi: number) {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal";
  if (bmi < 30) return "overweight";
  return "obese";
}

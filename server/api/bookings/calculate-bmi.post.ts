import { bmiSchema } from "~~/shared/validators/booking";
import { ok } from "~~/server/utils/api-response";
import { calculateBmi, getBmiCategory } from "~~/server/utils/bmi";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const data = bmiSchema.parse(body);

  const bmi = calculateBmi(data.heightCm, data.weightKg);
  const category = getBmiCategory(bmi);

  return ok({
    bmi,
    category,
  });
});

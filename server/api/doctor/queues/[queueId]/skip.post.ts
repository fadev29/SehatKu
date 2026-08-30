import { handleDoctorQueueAction } from '~~/server/utils/doctor-queue-action'

export default defineEventHandler(async (event) => {
  return handleDoctorQueueAction(event, 'skipped')
})

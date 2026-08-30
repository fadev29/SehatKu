type DoctorLike = {
  id?: string
  fullName?: string | null
}

type QueueLike = {
  id: string
  queueNumber: string
  status: string
  calledAt?: Date | null
  completedAt?: Date | null
  skippedAt?: Date | null
}

type MonitorVideoLike = {
  id: string
  title: string
  youtubeUrl: string
}

export function buildQueueEvent(event: string, queue: QueueLike, doctorName?: string | null) {
  return {
    event,
    at: new Date().toISOString(),
    payload: {
      queueId: queue.id,
      queueNumber: queue.queueNumber,
      status: queue.status,
      doctorName: doctorName ?? null,
      calledAt: queue.calledAt ?? null,
      completedAt: queue.completedAt ?? null,
      skippedAt: queue.skippedAt ?? null
    }
  }
}

export function buildMonitorActiveEvent(queue: QueueLike, doctor?: DoctorLike | null) {
  return {
    event: 'monitor.active',
    at: new Date().toISOString(),
    payload: {
      queueId: queue.id,
      queueNumber: queue.queueNumber,
      status: queue.status,
      doctorId: doctor?.id ?? null,
      doctorName: doctor?.fullName ?? null
    }
  }
}

export function buildMonitorIdleEvent(videos: MonitorVideoLike[]) {
  return {
    event: 'monitor.idle',
    at: new Date().toISOString(),
    payload: {
      videos
    }
  }
}

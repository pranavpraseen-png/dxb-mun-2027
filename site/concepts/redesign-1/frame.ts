// The pose the camera rig computed this frame; every world reads it (one source, so nothing drifts apart).
import { poseAt, type Pose } from './layout';

export const frame: { pose: Pose } = { pose: poseAt(0) };

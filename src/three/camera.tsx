import { useFrame } from '@react-three/fiber';
import { useRef, type ReactNode } from 'react';
import type { Group } from 'three';
import { DESIGN_HEIGHT, DESIGN_WIDTH, fitScale, toWorldY } from './designSpace';

export interface CameraPose {
  /** Design-space point at the centre of the view (y down). */
  x: number;
  y: number;
  /** Screen pixels per design pixel. */
  zoom: number;
}

/**
 * Moves the orthographic camera from a pose callback every frame. The callback
 * gets the host size so a scene can fit its frame (see `fitScale`).
 */
export function CameraRig({
  getPose,
}: {
  getPose: (hostWidth: number, hostHeight: number) => CameraPose;
}) {
  useFrame(({ camera, size }) => {
    const pose = getPose(size.width, size.height);
    camera.position.set(pose.x, toWorldY(pose.y), 100);
    camera.zoom = pose.zoom > 0 ? pose.zoom : 1;
    camera.updateProjectionMatrix();
  });
  return null;
}

/**
 * A layer glued to the 1920x1080 frame while the camera moves: the CSS-era
 * "outside the camera wrapper" composition. Children use frame coordinates
 * (x right, y down from the frame's top-left). Mount it after CameraRig so it
 * reads this frame's camera.
 */
export function FrameSpace({ children }: { children?: ReactNode }) {
  const ref = useRef<Group>(null);

  useFrame(({ camera, size }) => {
    const group = ref.current;
    const fit = fitScale(size.width, size.height);
    if (!group || fit <= 0) {
      return;
    }
    // One frame pixel is `inverse` world units at this camera zoom.
    const inverse = fit / camera.zoom;
    group.scale.set(inverse, inverse, 1);
    group.position.set(
      camera.position.x - (DESIGN_WIDTH / 2) * inverse,
      camera.position.y + (DESIGN_HEIGHT / 2) * inverse,
      0,
    );
  });

  return <group ref={ref}>{children}</group>;
}

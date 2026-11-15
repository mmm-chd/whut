import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Box3, Group, PerspectiveCamera, Raycaster, Vector3 } from 'three';
import { rawClearColor } from '../../../three/colors';
import type { InspectionPointId } from '../inspectionState';
import { INSPECTOR_BACKGROUND, INSPECTOR_VERTICAL_FOV, modelAnchors } from './modelConfig';
import type { InspectorModelResource } from './modelResource';
import { fitInspectorSphere, monitorAspect, normalizeModelBox } from './modelMath';
import type { InspectorRotation } from './rotation';

/**
 * The model inside the monitor.
 *
 * The camera never moves and the frame loop is on demand: the picture is drawn
 * when the model arrives, when the reader turns it, or when the monitor
 * resizes. The model is cloned and owned by `InspectorModelResource`, so this
 * component never disposes geometry it does not own.
 */
function RoverModel({
  resource,
  rotation,
  onOccluded,
}: {
  resource: InspectorModelResource;
  rotation: InspectorRotation;
  onOccluded: (occluded: readonly InspectionPointId[]) => void;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const camera = useThree((state) => state.camera);
  const wrapper = useMemo(() => new Group(), []);

  // Attaching happens in an effect, not during render: a strict-mode remount
  // must leave the model in the graph exactly once.
  useEffect(() => {
    const model = resource.scene;
    model.position.set(0, 0, 0);
    model.scale.setScalar(1);
    const box = new Box3().setFromObject(model);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const { scale, offset } = normalizeModelBox(size, center);

    model.position.set(offset.x, offset.y, offset.z);
    model.scale.setScalar(scale);
    wrapper.add(model);
    // A demand loop can swallow the invalidate issued inside the same commit
    // as its first frame, so the model arrives without a picture. Asking again
    // on the next animation frame is what makes the first frame show it.
    invalidate();
    const nextFrame = requestAnimationFrame(() => invalidate());
    return () => {
      cancelAnimationFrame(nextFrame);
      wrapper.remove(model);
    };
  }, [resource, wrapper, invalidate]);

  // Turning rotates the root; the camera stays put, so the model cannot drift
  // out of the fitted sphere.
  useEffect(() => {
    wrapper.rotation.set(rotation.pitch, rotation.yaw, 0);
    invalidate();
  }, [invalidate, rotation.pitch, rotation.yaw, wrapper]);

  // Which markers the body hides. This runs on turn changes only — the frame
  // loop is on demand, so there is no per-idle-frame ray budget to throttle.
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) {
      return;
    }
    const raycaster = new Raycaster();
    const worldPoint = new Vector3();
    const direction = new Vector3();
    const anchors = modelAnchors();
    const hidden: InspectionPointId[] = [];

    wrapper.updateMatrixWorld(true);
    for (const point of Object.keys(anchors) as InspectionPointId[]) {
      const anchor = anchors[point];
      worldPoint.set(anchor.x, anchor.y, anchor.z).applyMatrix4(wrapper.matrixWorld);
      direction.copy(worldPoint).sub(camera.position);
      const distance = direction.length();
      if (distance <= 0.05) {
        continue;
      }
      raycaster.set(camera.position, direction.normalize());
      raycaster.near = 0;
      raycaster.far = distance - 0.02;
      if (raycaster.intersectObject(wrapper, true).length > 0) {
        hidden.push(point);
      }
    }
    onOccluded(hidden);
  }, [camera, onOccluded, rotation.pitch, rotation.yaw, wrapper]);

  return <primitive object={wrapper} />;
}

/**
 * Tells the scene that the first real frame is on screen.
 *
 * A loaded model is not yet a picture: the chips must not appear over an empty
 * frame, and the loading card must not leave before there is something behind
 * it. The frame loop is on demand, so this fires once and then stays quiet.
 */
function FirstFrame({ onPainted }: { onPainted: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) {
      return;
    }
    done.current = true;
    onPainted();
  });
  return null;
}

function CameraRig() {
  const size = useThree((state) => state.size);
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);

  // The camera is a three.js object, so it is fitted imperatively: this is the
  // one place that owns its fov, clip planes and position.
  useEffect(() => {
    const aspect = monitorAspect(size.width, size.height);
    const fit = fitInspectorSphere(1, aspect, INSPECTOR_VERTICAL_FOV);
    if (camera instanceof PerspectiveCamera) {
      // three.js cameras are meant to be mutated; this effect owns this one.
      // oxlint-disable-next-line react/immutability
      camera.fov = INSPECTOR_VERTICAL_FOV;
      camera.aspect = aspect;
      camera.near = fit.near;
      camera.far = fit.far;
      camera.position.set(0, 0.18, fit.distance);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      invalidate();
    }
    const nextFrame = requestAnimationFrame(() => invalidate());
    return () => cancelAnimationFrame(nextFrame);
  }, [camera, invalidate, size.height, size.width]);

  return null;
}

export interface InspectorCanvasProps {
  readonly resource: InspectorModelResource;
  readonly rotation: InspectorRotation;
  readonly label: string;
  /** Context loss keeps the fallback picture rather than a black rectangle. */
  readonly onContextLost: () => void;
  readonly onOccluded?: (occluded: readonly InspectionPointId[]) => void;
  /** Called once, after the first frame with the model in it is drawn. */
  readonly onPainted?: () => void;
}

export function InspectorCanvas({
  resource,
  rotation,
  label,
  onContextLost,
  onOccluded,
  onPainted,
}: InspectorCanvasProps) {
  const handleOccluded = useCallback(
    (occluded: readonly InspectionPointId[]) => {
      onOccluded?.(occluded);
    },
    [onOccluded],
  );

  return (
    <div className="p04-canvas" data-inspector-canvas role="img" aria-label={label}>
      <Canvas
        flat
        linear
        dpr={[1, 2]}
        frameloop="demand"
        resize={{ offsetSize: true }}
        gl={{ antialias: true, alpha: false, powerPreference: 'low-power' }}
        camera={{ fov: INSPECTOR_VERTICAL_FOV, near: 0.1, far: 100, position: [0, 0.18, 4] }}
        onCreated={({ gl }) => {
          gl.setClearColor(rawClearColor(INSPECTOR_BACKGROUND));
          gl.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            onContextLost();
          });
        }}
      >
        <ambientLight intensity={2.1} />
        <directionalLight position={[3, 5, 4]} intensity={2.6} />
        <directionalLight position={[-4, -1, 3]} intensity={1.1} color="#a9c8e6" />
        <CameraRig />
        <RoverModel resource={resource} rotation={rotation} onOccluded={handleOccluded} />
        {onPainted ? <FirstFrame onPainted={onPainted} /> : null}
      </Canvas>
    </div>
  );
}

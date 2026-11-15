import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Box3, Group, PerspectiveCamera, Raycaster, Vector3 } from 'three';
import { rawClearColor } from '../../../three/colors';
import type { InspectionPointId } from '../inspectionState';
import { INSPECTOR_BACKGROUND, INSPECTOR_VERTICAL_FOV, modelAnchors } from './modelConfig';
import type { InspectorModelResource } from './modelResource';
import { fitInspectorSphere, monitorAspect, normalizeModelBox } from './modelMath';
import { monitorViewport } from './projection';
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
  const reportedRef = useRef<readonly InspectionPointId[] | null>(null);

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
    // One ray pass runs per pointer move while the reader turns the model.
    // Reporting an unchanged list would re-render the whole scene on every
    // move, and each commit is a chance for the browser to recomposite the
    // canvas between two demanded frames — which is exactly how a WebGL
    // picture blinks. Only a real change reaches the scene.
    const previous = reportedRef.current;
    if (
      previous &&
      previous.length === hidden.length &&
      previous.every((point, index) => hidden[index] === point)
    ) {
      return;
    }
    reportedRef.current = hidden;
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

/**
 * The light on the rover.
 *
 * A light stage is unforgiving: the old rig was two flat directional lamps, so
 * the body read as a silhouette on paper with no volume. This is a small studio
 * rig instead — a sky/ground fill for the base tone, a warm key from the
 * reader's upper left, a cool rim from behind to separate the body from the pale
 * backdrop, and two bounces from below so the underside of the wheels is not
 * black.
 *
 * No light casts a shadow. Percy's shadow used to fall across his own wheels and
 * legs, and on a light stage a part hidden in shadow reads as a part that is
 * missing. Every component stays lit instead, which is what an inspection view
 * is for.
 *
 * Every light is a plain three.js light with fixed numbers: no environment map,
 * no network asset, nothing that changes between machines.
 */
function InspectorLights() {
  return (
    <>
      {/* Sky above, warm ground below. Generous, because the body is dark grey
          metal on a white stage and the underside must not read as a hole. */}
      <hemisphereLight args={['#f4f8ff', '#f0e9d9', 2.6]} />
      <ambientLight intensity={1.6} color="#fff6e8" />
      {/* Key: warm, from the reader's upper left. Strong enough to draw a
          highlight along the top panels and leave the far side darker — that
          difference is what "lit" looks like. */}
      <directionalLight position={[3.4, 4.6, 3.2]} intensity={1.25} color="#fff4e2" />
      {/* Cool rim from behind right: the edge that says "metal". */}
      <directionalLight position={[-2.4, 1.8, -3.2]} intensity={0.85} color="#d8e8fb" />
      {/* Floor bounce, twice: the rubber is nearly black and a single bounce
          from one side leaves the far wheels as silhouettes. */}
      <directionalLight position={[0.4, -2.4, 1.8]} intensity={2.4} color="#f0e6d2" />
      <directionalLight position={[-2.2, -1.6, 1.2]} intensity={1.7} color="#e9e2d0" />
      {/* A low fill from the reader's left, for the wheels on that side. */}
      <directionalLight position={[-3.2, -0.6, 2.4]} intensity={0.9} color="#eef3fa" />
      {/* A frontal fill: the reader's own side of the rover. */}
      <directionalLight position={[0.2, 0.5, 4]} intensity={0.85} color="#ffffff" />
    </>
  );
}

function CameraRig({ zoom }: { readonly zoom: number }) {
  const size = useThree((state) => state.size);
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);

  // The camera is a three.js object, so it is fitted imperatively: this is the
  // one place that owns its fov, clip planes and position.
  useEffect(() => {
    const aspect = monitorAspect(size.width, size.height);
    const fit = fitInspectorSphere(1, aspect, INSPECTOR_VERTICAL_FOV);
    // The same helper the chips use, zoom included: one distance, one picture.
    const viewport = monitorViewport({ width: size.width, height: size.height }, zoom);
    if (camera instanceof PerspectiveCamera) {
      // three.js cameras are meant to be mutated; this effect owns this one.
      // oxlint-disable-next-line react/immutability
      camera.fov = INSPECTOR_VERTICAL_FOV;
      camera.aspect = aspect;
      camera.near = fit.near;
      camera.far = fit.far;
      camera.position.set(0, 0.18, viewport.distance);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      invalidate();
    }
    const nextFrame = requestAnimationFrame(() => invalidate());
    return () => cancelAnimationFrame(nextFrame);
  }, [camera, invalidate, size.height, size.width, zoom]);

  return null;
}

/**
 * Renderer settings are creation-time facts, so they live outside the
 * component: a fresh object per render only makes R3F re-configure a renderer
 * that is already right — and every extra commit is a chance to recomposite
 * the canvas between two demanded frames.
 */
const CANVAS_GL = {
  antialias: true,
  alpha: false,
  powerPreference: 'low-power',
  // The loop is on demand, so the buffer must survive the browser
  // re-compositing the frame on its own (a chip repaint, a hover change, a
  // pointer move). Without this the canvas is cleared between two draws and
  // the rover blinks out mid-rotation.
  preserveDrawingBuffer: true,
} as const;

const CANVAS_CAMERA = {
  fov: INSPECTOR_VERTICAL_FOV,
  near: 0.1,
  far: 100,
  position: [0, 0.18, 4] as [number, number, number],
};

export interface InspectorCanvasProps {
  readonly resource: InspectorModelResource;
  readonly rotation: InspectorRotation;
  readonly label: string;
  /** Context loss keeps the fallback picture rather than a black rectangle. */
  readonly onContextLost: () => void;
  readonly onOccluded?: (occluded: readonly InspectionPointId[]) => void;
  /** Called once, after the first frame with the model in it is drawn. */
  readonly onPainted?: () => void;
  /** Stage colour; the close-up asks for the light stage, P-04 keeps the dark one. */
  readonly background?: string;
  /**
   * Frame loop. `demand` draws only when something asks it to; `always` draws
   * every frame. A view the reader turns continuously asks for `always`.
   */
  readonly frameloop?: 'always' | 'demand';
  /** 1 is the fitted view; the camera walks in, the model stays put. */
  readonly zoom?: number;
  /**
   * Film-style tone mapping. Without it a `flat` canvas clips every highlight
   * hard at white, which is how a bright metal panel becomes a hole in the
   * picture. With it, highlights roll off the way the reference render's do.
   * P-04's dark monitor keeps the flat look it was tuned with.
   */
  readonly toneMapped?: boolean;
}

export function InspectorCanvas({
  resource,
  rotation,
  label,
  onContextLost,
  onOccluded,
  background = INSPECTOR_BACKGROUND,
  frameloop = 'demand',
  zoom = 1,
  toneMapped = false,
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
        flat={!toneMapped}
        linear
        dpr={[1, 1.75]}
        frameloop={frameloop}
        resize={{ offsetSize: true }}
        gl={CANVAS_GL}
        camera={CANVAS_CAMERA}
        onCreated={({ gl }) => {
          gl.setClearColor(rawClearColor(background));
          const canvas = gl.domElement;
          canvas.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            // A canvas that React is unmounting (strict-mode remount, scene
            // change) also reports a lost context. That is teardown, not a
            // failure, and reacting to it flipped the picture to the 2D
            // fallback for a frame. Only a canvas still in the document counts.
            requestAnimationFrame(() => {
              if (canvas.isConnected) {
                onContextLost();
              }
            });
          });
        }}
      >
        <InspectorLights />
        <CameraRig zoom={zoom} />
        <RoverModel resource={resource} rotation={rotation} onOccluded={handleOccluded} />
        {onPainted ? <FirstFrame onPainted={onPainted} /> : null}
      </Canvas>
    </div>
  );
}

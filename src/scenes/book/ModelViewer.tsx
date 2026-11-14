import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Box3, Group, Vector3, type Object3D } from 'three';
import type { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { WebGLStage } from '../../three/WebGLStage';

/**
 * Character model viewer (concept 10 and 11): the right page shows a passive,
 * slowly turning preview; the inspector reuses the same component with drag
 * rotation and a larger frame. The GLB is cached per URL and cloned per mount
 * so a page turn never re-downloads it.
 */

export type ModelStatus = 'loading' | 'ready' | 'error';

export interface OrbitRotation {
  /** Pitch in radians (clamped by the inspector). */
  x: number;
  /** Yaw in radians. */
  y: number;
}

const modelCache = new Map<string, Promise<Group>>();

let loaderPromise: Promise<GLTFLoader> | null = null;

/**
 * GLTFLoader plus Draco: the helicopter model is Draco-compressed, and the
 * decoder lives in `public/draco` so the book also works offline. Both modules
 * load on demand, keeping them out of the main chunk and out of jsdom tests.
 */
function getLoader(): Promise<GLTFLoader> {
  if (!loaderPromise) {
    loaderPromise = (async () => {
      const [{ GLTFLoader }, { DRACOLoader }] = await Promise.all([
        import('three/examples/jsm/loaders/GLTFLoader.js'),
        import('three/examples/jsm/loaders/DRACOLoader.js'),
      ]);
      const draco = new DRACOLoader();
      draco.setDecoderPath(`${import.meta.env.BASE_URL}draco/`);
      const loader = new GLTFLoader();
      loader.setDRACOLoader(draco);
      return loader;
    })();
    loaderPromise.catch(() => {
      loaderPromise = null;
    });
  }
  return loaderPromise;
}

async function loadModel(url: string): Promise<Group> {
  const cached = modelCache.get(url);
  if (cached) {
    return cached;
  }
  const promise = (async () => {
    const loader = await getLoader();
    return new Promise<Group>((resolve, reject) => {
      loader.load(
        url,
        (gltf) => resolve(gltf.scene),
        undefined,
        (error) => reject(error instanceof Error ? error : new Error(String(error))),
      );
    });
  })();
  modelCache.set(url, promise);
  // A failed request must be retryable when the reader reopens the book.
  promise.catch(() => modelCache.delete(url));
  return promise;
}

interface ModelStageProps {
  url: string;
  variant: 'preview' | 'inspector';
  interactive: boolean;
  rotationRef?: MutableRefObject<OrbitRotation>;
  reducedMotion: boolean;
  onStatus: (status: ModelStatus) => void;
}

const BASE_PITCH = 0.16;
const BASE_YAW = 0.55;

function ModelStage({
  url,
  variant,
  interactive,
  rotationRef,
  reducedMotion,
  onStatus,
}: ModelStageProps) {
  const [source, setSource] = useState<Group | null>(null);
  const yaw = useRef(BASE_YAW);
  const { size } = useThree();

  useEffect(() => {
    let alive = true;
    onStatus('loading');
    loadModel(url)
      .then((scene) => {
        if (!alive) {
          return;
        }
        setSource(scene);
        onStatus('ready');
      })
      .catch(() => {
        if (alive) {
          onStatus('error');
        }
      });
    return () => {
      alive = false;
    };
  }, [url, onStatus]);

  const model = useMemo<Group | null>(() => {
    if (!source) {
      return null;
    }
    const object: Object3D = source.clone(true);
    const box = new Box3().setFromObject(object);
    const dimensions = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const maxDimension = Math.max(dimensions.x, dimensions.y, dimensions.z) || 1;
    const target = Math.min(size.width, size.height) * (variant === 'inspector' ? 0.74 : 0.82);
    const scale = target / maxDimension;

    const group = new Group();
    group.add(object);
    object.position.set(-center.x, -center.y, -center.z);
    group.scale.setScalar(scale);
    group.rotation.set(BASE_PITCH, BASE_YAW, 0);
    return group;
  }, [source, size.width, size.height, variant]);

  useFrame((_, delta) => {
    if (!model) {
      return;
    }
    if (interactive && rotationRef) {
      model.rotation.y = rotationRef.current.y;
      model.rotation.x = Math.min(0.9, Math.max(-0.9, rotationRef.current.x));
      return;
    }
    if (reducedMotion) {
      model.rotation.set(BASE_PITCH, BASE_YAW, 0);
      return;
    }
    yaw.current += delta * (variant === 'inspector' ? 0.22 : 0.34);
    model.rotation.set(BASE_PITCH, yaw.current, 0);
  });

  if (!model) {
    return null;
  }
  return <primitive object={model} />;
}

export interface ModelViewerProps {
  model: string;
  portrait: string;
  label: string;
  variant?: 'preview' | 'inspector';
  /** False: the model turns by itself (preview). */
  interactive?: boolean;
  /** Shared target the inspector's drag handler writes to. */
  rotationRef?: MutableRefObject<OrbitRotation>;
  reducedMotion?: boolean;
  className?: string;
}

export function ModelViewer({
  model,
  portrait,
  label,
  variant = 'preview',
  interactive = false,
  rotationRef,
  reducedMotion = false,
  className = '',
}: ModelViewerProps) {
  const [status, setStatus] = useState<ModelStatus>('loading');

  return (
    <div
      className={`model-viewer model-viewer--${variant} ${className}`.trim()}
      data-status={status}
      data-interactive={interactive ? 'true' : 'false'}
    >
      <img
        className="model-viewer__portrait"
        src={portrait}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      <WebGLStage label={label} background={variant === 'inspector' ? '#16293f' : '#1d3a58'}>
        <ambientLight intensity={2.1} />
        <directionalLight position={[3, 5, 4]} intensity={2.9} />
        <directionalLight position={[-4, -1, 3]} intensity={1.1} color="#a9c8e6" />
        <ModelStage
          url={model}
          variant={variant}
          interactive={interactive}
          rotationRef={rotationRef}
          reducedMotion={reducedMotion}
          onStatus={setStatus}
        />
      </WebGLStage>
      {status === 'loading' ? (
        <span className="model-viewer__status" role="status">
          Loading 3D model…
        </span>
      ) : null}
    </div>
  );
}

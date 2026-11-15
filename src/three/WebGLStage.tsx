import { Canvas, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ColorManagement } from 'three';
import { rawClearColor } from './colors';
import { TextureCacheProvider } from './textures';
import './WebGLStage.css';

// Raw sRGB values pass through the sprite shader and blend in sRGB space,
// exactly like the browser blended <img> layers. Turn colour management off
// once, here, so `new Color('#rrggbb')` is not converted either.
ColorManagement.enabled = false;

let webglSupport: boolean | null = null;

/** True when this browser can create the WebGL2 context the stage needs. */
export function hasWebGL2(): boolean {
  if (webglSupport !== null) {
    return webglSupport;
  }
  if (typeof document === 'undefined' || /jsdom/i.test(navigator.userAgent)) {
    // jsdom has no WebGL; scenes still run on their node state without it.
    webglSupport = false;
    return webglSupport;
  }
  try {
    webglSupport = Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

export interface WebGLStageProps {
  /** Accessible description of the picture. */
  label: string;
  /** Clear colour, the last-resort backdrop behind every layer. */
  background?: string;
  /** Image IDs uploaded before the stage fades in. */
  preload?: readonly string[];
  children: ReactNode;
}

/**
 * The picture may only appear once it is both drawn and measured.
 *
 * A stage with no measured size would reveal an empty frame; the canvas
 * element's own 300 x 150 default is handled in CSS, because a small host may
 * legitimately measure exactly that.
 */
export function stageReady(texturesReady: boolean, width: number, height: number): boolean {
  return texturesReady && width > 1 && height > 1;
}

function StageContents({
  preload,
  onReady,
  children,
}: {
  preload?: readonly string[];
  onReady: () => void;
  children: ReactNode;
}) {
  const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy());
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const [texturesReady, setTexturesReady] = useState(false);
  const reportedRef = useRef(false);

  // Both conditions are latched here, so the parent is told once and only when
  // the first frame it would reveal is already the right size.
  useEffect(() => {
    if (reportedRef.current || !stageReady(texturesReady, width, height)) {
      return;
    }
    reportedRef.current = true;
    onReady();
  }, [height, onReady, texturesReady, width]);

  return (
    <TextureCacheProvider
      maxAnisotropy={Math.min(8, maxAnisotropy)}
      preload={preload}
      onReady={() => setTexturesReady(true)}
    >
      {children}
    </TextureCacheProvider>
  );
}

/**
 * One WebGL canvas for a scene: an orthographic camera in design pixels, a
 * fade-in once critical textures are uploaded, and recovery from context loss.
 * Without WebGL2 it renders an empty labelled box; story text and controls
 * (plain DOM above it) keep working.
 */
export function WebGLStage({ label, background = '#0b0f14', preload, children }: WebGLStageProps) {
  const [supported] = useState(hasWebGL2);
  const [ready, setReady] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [lost, setLost] = useState(false);

  const recover = useCallback(() => {
    setLost(false);
    setReady(false);
    // A new key builds a fresh context and re-uploads every texture.
    setGeneration((value) => value + 1);
  }, []);

  if (!supported) {
    return <div className="webgl-stage webgl-stage--unsupported" role="img" aria-label={label} />;
  }

  return (
    <div className="webgl-stage" data-ready={ready} data-webgl-stage role="img" aria-label={label}>
      <Canvas
        key={generation}
        orthographic
        flat
        linear
        dpr={[1, 2]}
        // Layout size, not the transformed bounding box: scenes inside a CSS 3D
        // book (tilt, page turn) must still fill their real slot.
        resize={{ offsetSize: true }}
        frameloop="always"
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 100], zoom: 1, near: 0.1, far: 1000 }}
        onCreated={({ gl }) => {
          gl.setClearColor(rawClearColor(background));
          const canvas = gl.domElement;
          canvas.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            setLost(true);
          });
          canvas.addEventListener('webglcontextrestored', recover);
        }}
      >
        <StageContents preload={preload} onReady={() => setReady(true)}>
          {children}
        </StageContents>
      </Canvas>
      {lost ? (
        <button type="button" className="webgl-stage__recover" onClick={recover}>
          The picture paused. Tap to continue.
        </button>
      ) : null}
    </div>
  );
}

import { createPortal, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, type ReactNode } from 'react';
import { Color, OrthographicCamera, Scene, WebGLRenderTarget } from 'three';
import { DESIGN_HEIGHT, DESIGN_WIDTH, fitScale } from './designSpace';
import type { SceneNode } from './nodeState';
import { SceneGroup } from './SceneGroup';
import { SpriteMesh } from './SpriteLayer';
import type { LoadedTexture } from './textures';

const MAX_TARGET_WIDTH = 2560;
const PIVOT = [DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2] as const;

interface FadeGroupProps {
  /** Opacity and transform of the whole composition. */
  node: SceneNode;
  /** Paint order of the composited quad. */
  order: number;
  children: ReactNode;
}

/**
 * Draws its children into an offscreen target the size of the 1920x1080
 * frame, then shows that image as one quad. A group fade therefore dims the
 * finished picture the way CSS `opacity` on a parent does; fading each layer
 * separately would let the world show through the overlaps.
 *
 * Children use frame coordinates (y down from the top-left). Place the group
 * inside <FrameSpace> to keep it glued to the frame while the camera moves.
 */
export function FadeGroup({ node, order, children }: FadeGroupProps) {
  const gl = useThree((state) => state.gl);
  const size = useThree((state) => state.size);

  const scene = useMemo(() => new Scene(), []);
  const camera = useMemo(() => {
    const cam = new OrthographicCamera(0, DESIGN_WIDTH, 0, -DESIGN_HEIGHT, 0.1, 1000);
    cam.position.z = 100;
    return cam;
  }, []);
  const target = useMemo(
    () => new WebGLRenderTarget(2, 2, { samples: 4, depthBuffer: false }),
    [],
  );
  useEffect(() => () => target.dispose(), [target]);

  const source = useMemo<LoadedTexture>(
    () => ({
      texture: target.texture,
      width: DESIGN_WIDTH,
      height: DESIGN_HEIGHT,
      placeholder: false,
    }),
    [target],
  );

  useFrame(() => {
    if (node.opacity <= 0.001) {
      return;
    }
    const fit = fitScale(size.width, size.height);
    if (fit <= 0) {
      return;
    }
    const pixelRatio = gl.getPixelRatio();
    const width = Math.min(MAX_TARGET_WIDTH, Math.ceil(DESIGN_WIDTH * fit * pixelRatio));
    const height = Math.ceil((width * DESIGN_HEIGHT) / DESIGN_WIDTH);
    if (target.width !== width || target.height !== height) {
      target.setSize(width, height);
    }

    const previousColor = new Color();
    gl.getClearColor(previousColor);
    const previousAlpha = gl.getClearAlpha();
    gl.setRenderTarget(target);
    gl.setClearColor(0x000000, 0);
    gl.clear();
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    gl.setClearColor(previousColor, previousAlpha);
  });

  return (
    <>
      {createPortal(<>{children}</>, scene)}
      <SceneGroup node={node} pivot={PIVOT}>
        <SpriteMesh
          source={source}
          order={order}
          x={0}
          y={0}
          w={DESIGN_WIDTH}
          h={DESIGN_HEIGHT}
        />
      </SceneGroup>
    </>
  );
}

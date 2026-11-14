import { createPortal, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, type ReactNode } from 'react';
import { Color, OrthographicCamera, Scene, WebGLRenderTarget } from 'three';
import { DESIGN_HEIGHT, DESIGN_WIDTH, fitScale } from './designSpace';
import type { SceneNode } from './nodeState';
import { SceneGroup } from './SceneGroup';
import { SpriteMesh } from './SpriteLayer';
import type { LoadedTexture } from './textures';

const MAX_TARGET_WIDTH = 2560;
const CENTER_X = DESIGN_WIDTH / 2;
const CENTER_Y = DESIGN_HEIGHT / 2;
const PIVOT = [CENTER_X, CENTER_Y] as const;

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
 *
 * The target covers the whole host, not just the 1920x1080 frame: on a host
 * that is not 16:9 it reaches past the frame on the short axis, so children
 * must draw art beyond the frame edges or the world shows through as bars.
 */
export function FadeGroup({ node, order, children }: FadeGroupProps) {
  const gl = useThree((state) => state.gl);
  const size = useThree((state) => state.size);
  const fitNow = fitScale(size.width, size.height);
  // Visible area in frame pixels, never smaller than the frame itself.
  const visibleWidth = Math.max(DESIGN_WIDTH, fitNow > 0 ? size.width / fitNow : DESIGN_WIDTH);
  const visibleHeight = Math.max(DESIGN_HEIGHT, fitNow > 0 ? size.height / fitNow : DESIGN_HEIGHT);

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
    const vw = Math.max(DESIGN_WIDTH, size.width / fit);
    const vh = Math.max(DESIGN_HEIGHT, size.height / fit);
    const width = Math.min(MAX_TARGET_WIDTH, Math.ceil(vw * fit * pixelRatio));
    const height = Math.ceil((width * vh) / vw);
    camera.left = CENTER_X - vw / 2;
    camera.right = CENTER_X + vw / 2;
    camera.top = vh / 2 - CENTER_Y;
    camera.bottom = -CENTER_Y - vh / 2;
    camera.updateProjectionMatrix();
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
          x={CENTER_X - visibleWidth / 2}
          y={CENTER_Y - visibleHeight / 2}
          w={visibleWidth}
          h={visibleHeight}
        />
      </SceneGroup>
    </>
  );
}

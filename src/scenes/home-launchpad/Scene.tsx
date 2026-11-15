import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useExperienceStore } from '../../app/experience.store';
import { useStoryStore } from '../../stores/story.store';
import { WebGLStage } from '../../three/WebGLStage';
import { ROCKET_TILT, PLAY_ANCHOR, projectToHost, DEPTHS } from './layers';
import { createHomeNodes, type HomeNodes } from './nodes';
import { homeParallax, layerOffset, pointerTarget, resetParallax, rocketTilt } from './parallax';
import { ParallaxDriver } from './ParallaxLayers';
import { useHomeScene } from './useHomeScene';
import { HomeWorld } from './World';
import '../../styles/stage.css';
import { homeWorldTextureIds } from './assets';
import './Scene.css';

/**
 * Stage 01 — Homepage "The Launchpad": the paper-cut launchpad, cursor
 * parallax, and the Play button that starts the launch (concept section 4).
 * Text, tabs, and the Play button are DOM above the canvas.
 */

interface PlayButtonProps {
  visible: boolean;
  nodes: HomeNodes;
  onPress: () => void;
}

/**
 * The Play button rides the rocket body (concept 4.6, 16.6). Only the CSS
 * variables are written each frame; the transform itself lives in CSS so the
 * pressed state can never fight the position (concept 4.4: the button squashes,
 * it does not move).
 */
function PlayButton({ visible, nodes, onPress }: PlayButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!visible) {
      return;
    }
    let frame = 0;
    const place = () => {
      const element = buttonRef.current;
      if (element) {
        const parallax = layerOffset(homeParallax.current, DEPTHS.rocket);
        // Follow the rocket itself: idle bob + the liftoff shift, plus its tilt.
        const offset = {
          x: parallax.x + nodes.rocket.motion.x,
          y: parallax.y + nodes.rocket.idle.y + nodes.rocket.motion.y,
        };
        const hostWidth = window.innerWidth;
        const hostHeight = window.innerHeight;
        const position = projectToHost(PLAY_ANCHOR, offset, hostWidth, hostHeight);
        element.style.setProperty('--play-x', `${position.x}px`);
        element.style.setProperty('--play-y', `${position.y}px`);
        element.style.setProperty(
          '--play-tilt',
          `${rocketTilt(homeParallax.current, ROCKET_TILT)}deg`,
        );
      }
      frame = requestAnimationFrame(place);
    };
    // One synchronous pass so the first paint is already on the rocket.
    place();
    return () => cancelAnimationFrame(frame);
  }, [visible, nodes]);

  return (
    <button
      type="button"
      ref={buttonRef}
      className="home-play"
      data-visible={visible}
      aria-label="Play — start the rocket launch"
      onClick={onPress}
    >
      <span className="home-play__icon" aria-hidden="true">
        &#9654;
      </span>
      <span className="home-play__label">Play</span>
    </button>
  );
}

interface InfoModalProps {
  kind: 'credit' | 'about';
  onClose: () => void;
}

/** The full credit roll: the team, the sources, and the voices. */
function CreditContent() {
  return (
    <>
      <h2 className="home-modal__title">The People Who Keep Looking Up</h2>
      <p className="home-modal__text">
        <strong>Porpopil</strong>
      </p>

      <h3 className="home-modal__section">Team Members</h3>
      <ul className="home-modal__list">
        <li>
          <strong>Severus Melvin Richard Mulyono</strong> — Project Leader &amp; Programmer
        </li>
        <li>
          <strong>Zulfiqar Sylmi Setiawan</strong> — Programmer
        </li>
        <li>
          <strong>Esta Janitra Lituhayu</strong> — Artist Coordinator
        </li>
        <li>
          <strong>Emmanuel Michael Anugerah Sriwardana</strong> — Designer &amp; Content Manager
        </li>
        <li>
          <strong>Myra Isadora</strong> — Project Designer &amp; Typewriter
        </li>
      </ul>

      <h3 className="home-modal__section">A Big Thank You to NASA!</h3>
      <p className="home-modal__text">
        For providing such an incredible collection of information and mission records
        that made these stories possible.
      </p>
      <ul className="home-modal__list">
        <li>NASA Space Science Data Coordinated Archive (NSSDCA)</li>
        <li>NASA Science</li>
        <li>NASA Mission Archives</li>
      </ul>

      <h3 className="home-modal__section">The Visuals Behind the Stories</h3>
      <p className="home-modal__text">
        Those visuals you see throughout this journey are brought to life through:
      </p>
      <ul className="home-modal__list">
        <li>
          <strong>Illustrations:</strong> AI-Generated
        </li>
        <li>
          <strong>3D Models:</strong> NASA 3D Resources
        </li>
        <li>
          <strong>Background &amp; Environment Assets:</strong> AI-Generated
        </li>
        <li>
          <strong>Fonts &amp; Typography:</strong> DK Cool Latin, Fredoka Latin
        </li>
      </ul>

      <h3 className="home-modal__section">Raise a Toast to the Voices Behind Our Characters!</h3>
      <p className="home-modal__text">
        A special appreciation to the wonderful volunteers who lent their voices to
        bring our characters and stories to life.
      </p>
      <ul className="home-modal__list">
        <li>
          <strong>Narration &amp; Voice-over:</strong>
          <ul className="home-modal__list">
            <li>
              <strong>Maria Gracia Anabelle Nugroho</strong> as Percy (Volunteer)
            </li>
            <li>
              <strong>Elisabeth Michelle Alexandria S.</strong> as Narrator (Volunteer)
            </li>
          </ul>
        </li>
        <li>
          <strong>Background Music:</strong> Pixabay (Free License)
        </li>
      </ul>

      <p className="home-modal__closing">
        Thank you for being part of our journey. Every mission leaves a story worth
        remembering.
      </p>
    </>
  );
}

function InfoModal({ kind, onClose }: InfoModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="home-modal" onClick={onClose}>
      <div
        className="home-modal__card"
        role="dialog"
        aria-modal="true"
        aria-label={kind === 'credit' ? 'Credit' : 'About'}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="home-modal__eyebrow">{kind === 'credit' ? 'Credit' : 'About'}</p>
        {kind === 'credit' ? (
          <CreditContent />
        ) : (
          <>
            <p className="home-modal__text">
              “What Happens Up There” is an interactive digital storybook website that
              tells the stories of NASA’s robotic space exploration objects on the Moon
              and Mars. Designed for children ages 8–12, it turns NASA’s complex space
              mission archives into an educational, interactive, and emotionally
              engaging learning experience.
            </p>
            <p className="home-modal__text">
              Each character is a real object — a rover, a lander, or another
              exploration vehicle — with a personality and backstory based on its
              actual function, achievements, and mission history. Through minigames
              inspired by each object’s functions and mission facts, users learn about
              its contributions to the history of space exploration.
            </p>
            <p className="home-modal__text">
              With the theme “Abandoned but Not Forgotten”, the project reframes
              neglect as a way to preserve the stories of objects that have completed
              their missions, pioneered exploration, or lost communication — but still
              have a place in the history of human exploration.
            </p>
            <p className="home-modal__text">
              Drawing on the NASA Space Science Data Coordinated Archive (NSSDCA),
              What Happens Up There combines scientific accuracy, accessible
              education, and emotional storytelling to bring forgotten stories back
              to life.
            </p>
          </>
        )}
        <button type="button" ref={closeRef} className="home-modal__close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

export function Scene00Home() {
  const reducedMotion = useStoryStore((state) => state.settings.reducedMotion);
  const setStage = useExperienceStore((state) => state.setStage);
  const [nodes] = useState(() => createHomeNodes(reducedMotion));
  const { phase, startLaunch } = useHomeScene(nodes, () => setStage('book'));
  const [modal, setModal] = useState<'credit' | 'about' | null>(null);

  // One pointer listener feeds the shared parallax target (concept 16.4).
  useEffect(() => {
    if (reducedMotion) {
      resetParallax();
      return;
    }
    const onMove = (event: PointerEvent) => {
      const target = pointerTarget(
        event.clientX,
        event.clientY,
        window.innerWidth,
        window.innerHeight,
      );
      homeParallax.target.x = target.x;
      homeParallax.target.y = target.y;
    };
    const onLeave = () => {
      homeParallax.target.x = 0;
      homeParallax.target.y = 0;
    };
    window.addEventListener('pointermove', onMove);
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, [reducedMotion]);

  const openCredit = useCallback(() => setModal('credit'), []);
  const openAbout = useCallback(() => setModal('about'), []);
  const closeModal = useCallback(() => setModal(null), []);

  return (
    <main className="home-scene story-grain" data-scene="home-launchpad" data-phase={phase}>
      <div className="home-stage">
        <WebGLStage
          label="Paper-cut launchpad illustration: a rocket waiting to launch on the coast at dusk."
          background="#6f9bb8"
          preload={homeWorldTextureIds}
        >
          <ParallaxDriver reducedMotion={reducedMotion} />
          <HomeWorld nodes={nodes} />
        </WebGLStage>
      </div>

      <h1 className="sr-only">Rocket Story — NASA Storybook</h1>

      <div className="home-hud" data-phase={phase}>
        <div className="home-tabs">
          <button type="button" className="home-tab" onClick={openCredit}>
            Credit
          </button>
          <button type="button" className="home-tab" onClick={openAbout}>
            About
          </button>
        </div>

        <div className="home-title">
          <span className="home-sticker">INTERACTIVE STORYBOOK</span>
          <h2 className="home-heading">What Happens Up There</h2>
          <p className="home-tagline">Press Play and ride the paper rocket into space.</p>
        </div>

        <PlayButton visible={phase === 'idle'} nodes={nodes} onPress={startLaunch} />
      </div>

      {modal ? <InfoModal kind={modal} onClose={closeModal} /> : null}
    </main>
  );
}

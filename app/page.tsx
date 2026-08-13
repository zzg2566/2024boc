"use client";

import { useEffect, useRef, useState } from "react";
import { youthProfiles } from "./profiles";

const learningTracks = [
  {
    number: "01",
    title: "理论研学",
    english: "THEORY STUDY",
    copy: "读原著、学原文、悟原理，在深学细悟中坚定理想信念。",
  },
  {
    number: "02",
    title: "团课学习",
    english: "YOUTH LECTURE",
    copy: "让团课成为青年成长的思想课堂、实践课堂与精神课堂。",
  },
  {
    number: "03",
    title: "政策解读",
    english: "POLICY INSIGHT",
    copy: "把握政策方向，理解金融使命，提升服务发展大局的能力。",
  },
  {
    number: "04",
    title: "学习感悟",
    english: "YOUTH VOICES",
    copy: "以青年视角分享所学所思，让认识在交流碰撞中不断深化。",
  },
];

const padNumber = (value: number) => String(value).padStart(2, "0");

export default function Home() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<"next" | "previous">("next");
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioContext = useRef<AudioContext | null>(null);
  const musicTimer = useRef<number | null>(null);
  const musicStep = useRef(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const activeProfile = youthProfiles[activeIndex];

  const stopMusic = () => {
    if (musicTimer.current !== null) {
      window.clearInterval(musicTimer.current);
      musicTimer.current = null;
    }
    if (audioContext.current) {
      void audioContext.current.close();
      audioContext.current = null;
    }
    musicStep.current = 0;
    setIsMusicPlaying(false);
  };

  const startMusic = () => {
    if (audioContext.current) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const masterGain = context.createGain();
    masterGain.gain.value = 0.055;
    masterGain.connect(context.destination);
    audioContext.current = context;

    const chords = [
      [261.63, 329.63, 392.0],
      [220.0, 261.63, 329.63],
      [174.61, 220.0, 261.63],
      [196.0, 246.94, 293.66],
    ];

    const playChord = () => {
      const now = context.currentTime;
      const chord = chords[musicStep.current % chords.length];
      chord.forEach((frequency, noteIndex) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = noteIndex === 0 ? "sine" : "triangle";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(noteIndex === 0 ? 0.33 : 0.15, now + 0.65);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.6);
        oscillator.connect(gain);
        gain.connect(masterGain);
        oscillator.start(now);
        oscillator.stop(now + 4.8);
      });
      musicStep.current += 1;
    };

    void context.resume();
    playChord();
    musicTimer.current = window.setInterval(playChord, 4200);
    setIsMusicPlaying(true);
  };

  const toggleMusic = () => {
    if (isMusicPlaying) stopMusic();
    else startMusic();
  };

  useEffect(() => {
    const activateMusic = () => startMusic();
    document.addEventListener("pointerdown", activateMusic, { once: true });
    document.addEventListener("keydown", activateMusic, { once: true });

    return () => {
      document.removeEventListener("pointerdown", activateMusic);
      document.removeEventListener("keydown", activateMusic);
      if (musicTimer.current !== null) window.clearInterval(musicTimer.current);
      if (audioContext.current) void audioContext.current.close();
    };
  }, []);

  const selectProfile = (index: number, direction?: "next" | "previous") => {
    const nextIndex = (index + youthProfiles.length) % youthProfiles.length;
    if (nextIndex === activeIndex) return;
    setSlideDirection(direction || (nextIndex > activeIndex ? "next" : "previous"));
    setDragOffset(0);
    setIsDragging(false);
    setActiveIndex(nextIndex);
  };

  const showPreviousProfile = () => selectProfile(activeIndex - 1, "previous");
  const showNextProfile = () => selectProfile(activeIndex + 1, "next");

  const scrollToProfiles = () => {
    document.getElementById("youth")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="page-shell">
      <button
        type="button"
        className={`music-toggle${isMusicPlaying ? " is-playing" : ""}`}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          toggleMusic();
        }}
        aria-label={isMusicPlaying ? "暂停轻音乐" : "播放轻音乐"}
        aria-pressed={isMusicPlaying}
      >
        <span className="music-disc" aria-hidden="true"><i /></span>
        <span className="music-label">{isMusicPlaying ? "音乐播放中" : "轻音乐"}</span>
      </button>
      <section className="hero" id="top" aria-labelledby="hero-title">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-rays" aria-hidden="true" />
        <div className="hero-orbit hero-orbit-one" aria-hidden="true" />
        <div className="hero-orbit hero-orbit-two" aria-hidden="true" />

        <header className="brand-bar">
          <a className="brand" href="#top" aria-label="返回页面顶部">
            <span className="brand-mark">
              <img src="/boc-logo.jpg" alt="" />
            </span>
            <span className="brand-copy">
              <strong>中国银行益阳分行</strong>
              <small>BANK OF CHINA · YIYANG BRANCH</small>
            </span>
          </a>
          <span className="column-seal">青年学习<br />主题专栏</span>
        </header>

        <div className="hero-content">
          <p className="hero-kicker"><span>BOC YOUTH</span> 理论学习专栏</p>
          <h1 id="hero-title">
            <span>青学笃行</span>
            <em>青年学习</em>
          </h1>
          <div className="hero-slogan">
            <span>思想之光照亮奋进之路</span>
            <span>理论学习筑牢青年根基</span>
          </div>
          <p className="hero-intro">
            坚持学思用贯通、知信行统一，把学习成效落实到履职实践，
            争做信念坚定、本领过硬的金融青年。
          </p>
          <div className="hero-actions">
            <button type="button" className="primary-action" onClick={scrollToProfiles}>
              开启青年学习志 <span aria-hidden="true">↓</span>
            </button>
            <div className="issue-count"><strong>19</strong><span>YOUTH<br />VOICES</span></div>
          </div>
        </div>

        <div className="hero-footer">
          <span>THINK · LEARN · PRACTICE</span>
          <span className="scroll-cue" aria-hidden="true"><i /></span>
        </div>
      </section>

      <nav className="chapter-nav" aria-label="页面章节导航">
        <a href="#mission">栏目导语</a>
        <a href="#tracks">学习版块</a>
        <a href="#youth">青年风采</a>
      </nav>

      <section className="mission section-pad" id="mission">
        <div className="section-heading reveal-ready">
          <div>
            <p className="section-kicker">LEARNING IN ACTION · 01</p>
            <h2>以学铸魂<br />以学增智</h2>
          </div>
          <span className="heading-stamp">学<br />思<br />用</span>
        </div>
        <div className="mission-layout">
          <p className="mission-lead">
            理论上的清醒，方有政治上的坚定；思想上的笃定，才有行动上的自觉。
          </p>
          <p className="mission-copy">
            本栏目推送理论研学、团课学习、政策解读与学习感悟，引导全行青年强化理论武装，
            不断提升政治素养与业务能力，让青春在金融报国的实践中焕发更加绚丽的光彩。
          </p>
        </div>
      </section>

      <section className="tracks section-pad" id="tracks" aria-labelledby="tracks-title">
        <div className="tracks-heading">
          <p className="section-kicker light">KNOWLEDGE TO PRACTICE · 02</p>
          <h2 id="tracks-title">四维学习 · 一路笃行</h2>
          <p>从理论原点出发，把青春坐标落在中行事业发展需要的地方。</p>
        </div>
        <div className="track-grid">
          {learningTracks.map((track) => (
            <article className="track-card" key={track.number}>
              <div className="track-number">{track.number}</div>
              <div className="track-symbol" aria-hidden="true">{track.number === "01" ? "知" : track.number === "02" ? "信" : track.number === "03" ? "融" : "行"}</div>
              <p>{track.english}</p>
              <h3>{track.title}</h3>
              <span>{track.copy}</span>
            </article>
          ))}
        </div>
      </section>

      <aside className="quote-band" aria-label="栏目寄语">
        <span className="quote-mark" aria-hidden="true">“</span>
        <p>让学习成为青春远航的动力，<br />让增长的本领成为搏击风浪的能量。</p>
        <span className="quote-en">STAY CURIOUS · STAY COMMITTED</span>
      </aside>

      <section className="profiles section-pad" id="youth" aria-labelledby="profiles-title">
        <div className="profiles-heading">
          <div>
            <p className="section-kicker">YOUTH PORTRAITS · 03</p>
            <h2 id="profiles-title">青年学习志</h2>
            <p>19 位青年 · 19 份思考 · 同一束奋进之光</p>
          </div>
          <div className="profiles-total"><strong>19</strong><span>位青年<br />青春之声</span></div>
        </div>

        <div className="profile-index" role="tablist" aria-label="选择青年人物">
          {youthProfiles.map((profile, index) => (
            <button
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-controls="profile-stage"
              className={index === activeIndex ? "is-active" : ""}
              onClick={() => selectProfile(index)}
              key={profile.slot}
            >
              <span>{padNumber(profile.slot)}</span>
              <small>{profile.name || "待补"}</small>
            </button>
          ))}
        </div>

        <div className="profile-mobile-nav" aria-label="手机端人物切换">
          <button type="button" onClick={showPreviousProfile} aria-label="上一位青年">
            <span aria-hidden="true">←</span>
          </button>
          <label className="profile-jump">
            <span>选择青年</span>
            <select
              value={activeIndex}
              onChange={(event) => selectProfile(Number(event.target.value))}
              aria-controls="profile-stage"
            >
              {youthProfiles.map((profile, index) => (
                <option value={index} key={profile.slot}>
                  {padNumber(profile.slot)} · {profile.name || "资料待补"}
                </option>
              ))}
            </select>
            <small>左右滑动也可切换</small>
          </label>
          <button type="button" onClick={showNextProfile} aria-label="下一位青年">
            <span aria-hidden="true">→</span>
          </button>
        </div>

        <article
          className={`profile-stage slide-${slideDirection}${isDragging ? " is-dragging" : ""}`}
          key={activeProfile.slot}
          id="profile-stage"
          tabIndex={0}
          aria-live="polite"
          aria-atomic="true"
          aria-label={`第 ${activeProfile.slot} 位青年资料`}
          style={dragOffset ? {
            transform: `translate3d(${dragOffset}px, 0, 0) scale(${1 - Math.min(Math.abs(dragOffset) / 1800, 0.025)})`,
            opacity: 1 - Math.min(Math.abs(dragOffset) / 700, 0.18),
          } : undefined}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") showPreviousProfile();
            if (event.key === "ArrowRight") showNextProfile();
          }}
          onTouchStart={(event) => {
            const touch = event.changedTouches[0];
            touchStart.current = { x: touch.clientX, y: touch.clientY };
            setIsDragging(true);
          }}
          onTouchMove={(event) => {
            const start = touchStart.current;
            if (!start) return;
            const touch = event.changedTouches[0];
            const deltaX = touch.clientX - start.x;
            const deltaY = touch.clientY - start.y;
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
              const resistedOffset = Math.sign(deltaX) * Math.min(Math.abs(deltaX) * .82, 130);
              setDragOffset(resistedOffset);
            }
          }}
          onTouchEnd={(event) => {
            const start = touchStart.current;
            touchStart.current = null;
            setIsDragging(false);
            setDragOffset(0);
            if (!start) return;
            const touch = event.changedTouches[0];
            const deltaX = touch.clientX - start.x;
            const deltaY = touch.clientY - start.y;
            if (Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
              if (deltaX < 0) showNextProfile();
              else showPreviousProfile();
            }
          }}
          onTouchCancel={() => {
            touchStart.current = null;
            setIsDragging(false);
            setDragOffset(0);
          }}
        >
          <div className={`profile-visual fit-${activeProfile.imageFit}`}>
            {activeProfile.image ? (
              <>
                {activeProfile.imageFit === "contain" && (
                  <img
                    className="profile-photo-backdrop"
                    src={activeProfile.image}
                    alt=""
                    aria-hidden="true"
                  />
                )}
                <img
                  className="profile-photo"
                  src={activeProfile.image}
                  alt={`${activeProfile.name}工作照`}
                  style={{ objectPosition: activeProfile.imagePosition }}
                />
              </>
            ) : (
              <div className="photo-placeholder">
                <span className="photo-slot">NO. {padNumber(activeProfile.slot)}</span>
                <div className="portrait-outline" aria-hidden="true"><i /><b /></div>
                <strong>照片待上传</strong>
                <small>PORTRAIT MATERIAL PENDING</small>
              </div>
            )}
            <div className="photo-caption"><span>BOC YOUTH</span><b>笃行者 · 奋斗者</b></div>
          </div>

          <div className="profile-content" key={activeProfile.slot}>
            <div className="profile-meta">
              <span>YOUTH PROFILE</span>
              <b>NO. {padNumber(activeProfile.slot)} / 19</b>
            </div>
            <h3>{activeProfile.name || "姓名待补充"}</h3>
            <p className="profile-department">
              {activeProfile.department || "所在机构待补充"}
              <span>·</span>
              {activeProfile.role || "岗位待补充"}
            </p>
            <div className="content-block intro-block">
              <p className="content-label"><span>01</span> ABOUT ME / 自我介绍</p>
              <p>{activeProfile.intro || "员工自我介绍将在素材确认后呈现于此处。"}</p>
            </div>
            <div className="content-block reflection-block">
              <p className="content-label"><span>02</span> LEARNING NOTES / 学习感悟</p>
              <blockquote>
                {activeProfile.reflection || "学习主题、心得感悟与履职实践内容待补充。"}
              </blockquote>
            </div>
          </div>
        </article>

        <div className="profile-controls">
          <button type="button" onClick={showPreviousProfile} aria-label="上一位青年">
            <span aria-hidden="true">←</span> 上一位
          </button>
          <div className="control-progress" aria-hidden="true">
            <i style={{ width: `${((activeIndex + 1) / youthProfiles.length) * 100}%` }} />
          </div>
          <span><strong>{padNumber(activeIndex + 1)}</strong> / 19</span>
          <button type="button" onClick={showNextProfile} aria-label="下一位青年">
            下一位 <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>

      <section className="closing section-pad">
        <div className="closing-rings" aria-hidden="true" />
        <p className="section-kicker light">YOUTH IN PRACTICE · 向新而行</p>
        <h2><span>知</span><i>·</i><span>信</span><i>·</i><span>行</span></h2>
        <p>心中有信仰，脚下有力量。<br />以学促干、以干践学，在新征程上书写金融青年的青春答卷。</p>
        <a href="#top">回到篇首 <span aria-hidden="true">↑</span></a>
      </section>

      <footer className="site-footer">
        <div className="footer-brand">
          <div><strong>青学笃行｜青年学习</strong><span>中国银行益阳分行团青主题 H5</span></div>
        </div>
        <div className="footer-meta">
          <p><span>来源</span>中国银行益阳分行团委</p>
          <p><span>编辑</span>曾子刚、杨伊静、张盼、杨庆龄</p>
          <p><span>审核</span>刘娟</p>
        </div>
      </footer>
    </main>
  );
}

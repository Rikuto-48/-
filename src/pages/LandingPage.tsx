import type { ReactNode } from 'react'
import profilePhoto from '../assets/profile/profile-photo.jpg'
import trainingPhoto1 from '../assets/profile/training-1.jpg'
import trainingPhoto2 from '../assets/profile/training-2.jpg'
import trainingPhoto3 from '../assets/profile/training-3.jpg'
import {
  BENEFITS,
  CONCEPT,
  PAIN_POINTS,
  PRICING,
  PROFILE,
  ROADMAP,
  SUPPORT_FEATURES,
  TESTIMONIALS,
  TRAINING_PHOTO_ALTS,
} from '../data/landingContent'

const LINE_URL = import.meta.env.VITE_LINE_URL || 'https://line.me/'

const TRAINING_PHOTOS = [trainingPhoto1, trainingPhoto2, trainingPhoto3]

function LineButton({ children }: { children: ReactNode }) {
  return (
    <a className="lp-line-button" href={LINE_URL} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

function Paragraphs({ lines, className }: { lines: string[]; className: string }) {
  return (
    <>
      {lines.map((line) => (
        <p key={line} className={className}>
          {line.split('\n').map((part, i, parts) => (
            <span key={part}>
              {part}
              {i < parts.length - 1 && <br />}
            </span>
          ))}
        </p>
      ))}
    </>
  )
}

function PhotoBreak({ src, alt, tilt }: { src: string; alt: string; tilt: 'left' | 'right' }) {
  return (
    <section className="lp-photo-break">
      <img src={src} alt={alt} className={`lp-photo-break-img lp-photo-break-${tilt}`} loading="lazy" />
    </section>
  )
}

function LandingPage() {
  return (
    <main className="lp">
      {/* ヒーロー */}
      <section className="lp-hero">
        <p className="lp-hero-eyebrow">パーソナルトレーニング「イクマ」</p>
        <h1 className="lp-hero-title">{CONCEPT.catchCopy}</h1>
        <Paragraphs lines={CONCEPT.lead} className="lp-hero-lead" />
        <div className="lp-hero-actions">
          <a className="lp-primary-button" href="/diagnosis">
            30秒で自分のタイプを診断する
          </a>
          <LineButton>LINEで無料相談する</LineButton>
        </div>
      </section>

      <PhotoBreak src={TRAINING_PHOTOS[0]} alt={TRAINING_PHOTO_ALTS[0]} tilt="left" />

      {/* こんな方へ */}
      <section className="lp-section">
        <h2 className="lp-section-title">こんな方へ</h2>
        <div className="lp-pain-list">
          {PAIN_POINTS.map((pain) => (
            <div key={pain.title} className="lp-pain-card">
              <p className="lp-pain-title">{pain.title}</p>
              <p className="lp-pain-description">{pain.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* サポート内容 */}
      <section className="lp-section lp-section-alt">
        <h2 className="lp-section-title">サポート内容</h2>
        <div className="lp-feature-list">
          {SUPPORT_FEATURES.map((feature) => (
            <div key={feature.title} className="lp-feature-card">
              <p className="lp-feature-title">{feature.title}</p>
              <p className="lp-feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <PhotoBreak src={TRAINING_PHOTOS[1]} alt={TRAINING_PHOTO_ALTS[1]} tilt="right" />

      {/* 得られるベネフィット */}
      <section className="lp-section">
        <h2 className="lp-section-title">得られる変化</h2>
        <ul className="lp-benefit-list">
          {BENEFITS.map((benefit) => (
            <li key={benefit} className="lp-benefit-item">
              {benefit}
            </li>
          ))}
        </ul>
      </section>

      {/* 6ヶ月ロードマップ */}
      <section className="lp-section lp-section-alt">
        <h2 className="lp-section-title">6ヶ月のロードマップ</h2>
        <div className="lp-roadmap">
          {ROADMAP.map((phase) => (
            <div key={phase.period} className="lp-roadmap-phase">
              <p className="lp-roadmap-period">{phase.period}</p>
              <p className="lp-roadmap-title">{phase.title}</p>
              <ul className="lp-roadmap-items">
                {phase.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <PhotoBreak src={TRAINING_PHOTOS[2]} alt={TRAINING_PHOTO_ALTS[2]} tilt="left" />

      {/* お客様の声 */}
      <section className="lp-section">
        <h2 className="lp-section-title">お客様の声</h2>
        <div className="lp-testimonial-list">
          {TESTIMONIALS.map((testimonial) => (
            <div key={testimonial.title} className="lp-testimonial-card">
              <p className="lp-testimonial-title">{testimonial.title}</p>
              <Paragraphs lines={testimonial.body} className="lp-testimonial-paragraph" />
            </div>
          ))}
        </div>
      </section>

      {/* 料金 */}
      <section className="lp-section lp-section-alt">
        <h2 className="lp-section-title">料金プラン</h2>
        <div className="lp-price-card">
          <p className="lp-price-duration">{PRICING.duration}フルサポートプログラム</p>
          <p className="lp-price-amount">¥{PRICING.price}</p>
          <p className="lp-price-note">
            月2回Zoom（計12回）+ LINE随時サポート
            <br />
            + オーダーメイドメニュー + 食事管理 + マインドセットコーチング
          </p>
        </div>
        <div className="lp-comparison-table">
          {PRICING.comparisons.map((row) => (
            <div
              key={row.label}
              className={`lp-comparison-row ${row.highlight ? 'lp-comparison-row-highlight' : ''}`}
            >
              <p className="lp-comparison-label">{row.label}</p>
              <p className="lp-comparison-price">{row.price}</p>
              <p className="lp-comparison-note">{row.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* プロフィール */}
      <section className="lp-section">
        <h2 className="lp-section-title">運営者プロフィール</h2>
        <div className="lp-profile-card">
          <img src={profilePhoto} alt={PROFILE.name} className="lp-profile-photo" loading="lazy" />
          <p className="lp-profile-name">{PROFILE.name}</p>
          <p className="lp-profile-role">{PROFILE.role}</p>
          <Paragraphs lines={PROFILE.bio} className="lp-profile-bio" />
        </div>
      </section>

      {/* 最終CTA */}
      <section className="lp-final-cta">
        <h2 className="lp-final-cta-title">まずは無料相談から</h2>
        <p className="lp-final-cta-lead">LINE登録で、あなたに合ったプランをご案内します。</p>
        <div className="lp-hero-actions">
          <a className="lp-primary-button" href="/diagnosis">
            30秒で自分のタイプを診断する
          </a>
          <LineButton>LINEで無料相談する</LineButton>
        </div>
      </section>
    </main>
  )
}

export default LandingPage

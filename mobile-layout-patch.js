"use strict";

// スマホ画面でゲーム領域を広くし、ショットとホーンを小型化します。
(() => {
  const style = document.createElement("style");
  style.textContent = `
    @media (hover: none), (pointer: coarse) {
      #gameScreen.active {
        gap: 3px !important;
      }

      .hud {
        gap: 3px !important;
      }

      .hud-card,
      .hud-card.wide {
        min-height: 39px !important;
        padding: 3px 4px !important;
      }

      .hud-card span {
        font-size: 0.58rem !important;
      }

      .hud-card strong {
        font-size: 0.76rem !important;
      }

      .horn-hud {
        min-height: 29px !important;
        padding: 2px 4px !important;
      }

      .horn-hud span {
        display: inline-block !important;
        margin-right: 5px;
      }

      .horn-hud strong {
        font-size: 0.68rem !important;
      }

      .horn-hud .bar {
        width: calc(100% - 92px) !important;
        height: 6px !important;
      }

      .touch-controls {
        gap: 5px !important;
        padding: 4px 5px max(4px, var(--safe-bottom)) !important;
      }

      .move-pad,
      .pedals {
        min-height: 130px !important;
      }

      .move-pad {
        grid-template-rows: repeat(3, minmax(39px, 1fr)) !important;
        gap: 3px !important;
      }

      .pedals {
        grid-template-columns: minmax(0, 0.78fr) minmax(0, 0.78fr) minmax(0, 1.44fr) !important;
        grid-template-rows: 1fr 1fr !important;
        gap: 4px !important;
      }

      .pedals .horn-button {
        grid-column: 1 !important;
        grid-row: 1 !important;
      }

      .pedals .shot-button {
        grid-column: 2 !important;
        grid-row: 1 !important;
      }

      .pedals .brake-button {
        grid-column: 1 / 3 !important;
        grid-row: 2 !important;
      }

      .pedals .accelerate-button {
        grid-column: 3 !important;
        grid-row: 1 / 3 !important;
        min-height: 130px !important;
      }

      .pedals .horn-button,
      .pedals .shot-button {
        min-height: 46px !important;
        padding: 2px !important;
        border-radius: 12px !important;
        font-size: 0.56rem !important;
        line-height: 1 !important;
      }

      .pedals .horn-button .button-icon,
      .pedals .shot-button .button-icon {
        margin-bottom: 2px !important;
        font-size: 1rem !important;
      }

      .pedals .brake-button {
        min-height: 48px !important;
        font-size: 0.68rem !important;
      }

      .pedals .accelerate-button {
        font-size: 0.82rem !important;
      }

      #gameCanvas {
        max-height: calc(100dvh - 255px - var(--safe-top) - var(--safe-bottom)) !important;
      }
    }

    @media (hover: none) and (max-width: 390px), (pointer: coarse) and (max-width: 390px) {
      .move-pad,
      .pedals,
      .pedals .accelerate-button {
        min-height: 118px !important;
      }

      .move-pad {
        grid-template-rows: repeat(3, minmax(35px, 1fr)) !important;
      }

      .pedals .horn-button,
      .pedals .shot-button {
        min-height: 42px !important;
      }

      #gameCanvas {
        max-height: calc(100dvh - 232px - var(--safe-top) - var(--safe-bottom)) !important;
      }
    }

    @media (hover: none) and (max-height: 700px), (pointer: coarse) and (max-height: 700px) {
      .move-pad,
      .pedals,
      .pedals .accelerate-button {
        min-height: 105px !important;
      }

      .move-pad {
        grid-template-rows: repeat(3, minmax(31px, 1fr)) !important;
      }

      .pedals .horn-button,
      .pedals .shot-button {
        min-height: 38px !important;
      }

      #gameCanvas {
        max-height: calc(100dvh - 205px - var(--safe-top) - var(--safe-bottom)) !important;
      }
    }
  `;
  document.head.appendChild(style);
})();

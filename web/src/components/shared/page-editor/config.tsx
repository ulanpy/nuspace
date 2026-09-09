import type { CSSProperties } from "react"
import type { Config, Field } from "@puckeditor/core"

import {
  ColorField,
  contrastColor,
  DEFAULT_TEXT_COLOR,
  optionsField,
  rootFontOptions,
  rootRadiusOptions,
} from "./blocks/_lib"
import { Button, type ButtonProps } from "./blocks/Button"
import { Card, type CardProps } from "./blocks/Card"
import { Flex, type FlexProps } from "./blocks/Flex"
import { Grid, type GridProps } from "./blocks/Grid"
import { Heading, type HeadingProps } from "./blocks/Heading"
import { Hero, type HeroProps } from "./blocks/Hero"
import { Image, type ImageProps } from "./blocks/Image"
import { RichText, type RichTextProps } from "./blocks/RichText"
import { Space, type SpaceProps } from "./blocks/Space"
import { Stats, type StatsProps } from "./blocks/Stats"
import { Text, type TextProps } from "./blocks/Text"
import { Video, type VideoProps } from "./blocks/Video"

type PageComponents = {
  Button: ButtonProps
  Card: CardProps
  Flex: FlexProps
  Grid: GridProps
  Heading: HeadingProps
  Hero: HeroProps
  Image: ImageProps
  RichText: RichTextProps
  Space: SpaceProps
  Stats: StatsProps
  Text: TextProps
  Video: VideoProps
}

type PageRootProps = {
  backgroundColor?: string
  /** Global text color. Blocks with their text color set to "Default" use it. */
  textColor?: string
  /**
   * Brand color ("Main color") used by controls that have no explicit color of
   * their own: primary buttons, icon badges and similar accents.
   */
  accentColor?: string
  fontFamily?: string
  /** A "12px"-style value; a legacy number is also accepted. Empty means fall back to the default radius. */
  borderRadius?: string | number
  /** An "0px"-style value; parsed to a number when applied. */
  horizontalPadding?: string
  /** Renders an informational note at the top of the root fields. */
  note?: string
}

type PageCategories = "layout" | "typography" | "actions" | "media" | "other"

export type PageEditorConfig = Config<
  PageComponents,
  PageRootProps,
  PageCategories
>

export const pageEditorConfig: PageEditorConfig = {
  components: {
    Button: Button,
    Card: Card,
    Flex: Flex,
    Grid: Grid,
    Heading: Heading,
    Hero: Hero,
    Image: Image,
    RichText: RichText,
    Space: Space,
    Stats: Stats,
    Text: Text,
    Video: Video,
  },
  categories: {
    layout: { components: ["Grid", "Flex", "Space"], title: "Layout" },
    typography: {
      components: ["Heading", "Text", "RichText"],
      title: "Typography",
    },
    actions: { components: ["Button", "Hero"], title: "Actions" },
    media: { components: ["Image", "Video"], title: "Media" },
    other: { components: ["Card", "Stats"], title: "Other" },
  },
  root: {
    fields: {
      backgroundColor: {
        type: "custom",
        label: "Page background color",
        render: ColorField,
        allowReset: false,
      } as unknown as Field<PageRootProps["backgroundColor"]>,
      note: {
        type: "custom",
        render: () => (
          <p
            style={{
              fontSize: 12,
              lineHeight: 1.45,
              color: "var(--puck-color-text-secondary)",
              margin: "0 0 4px",
            }}
          >
            The settings below will apply to all blocks on the page with default
            styles and new ones.
          </p>
        ),
      } as unknown as Field<PageRootProps["note"]>,
      textColor: {
        type: "custom",
        label: "Text color",
        render: ColorField,
        allowReset: false,
      } as unknown as Field<PageRootProps["textColor"]>,
      accentColor: {
        type: "custom",
        label: "Main color",
        render: ColorField,
        allowReset: false,
      } as unknown as Field<PageRootProps["accentColor"]>,
      fontFamily: optionsField<PageRootProps["fontFamily"]>(
        "Default font",
        rootFontOptions
      ),
      borderRadius: optionsField<PageRootProps["borderRadius"]>(
        "Border radius",
        rootRadiusOptions
      ),
      horizontalPadding: optionsField<PageRootProps["horizontalPadding"]>(
        "Horizontal padding",
        [
          { label: "0px", value: "0px" },
          { label: "16px", value: "16px" },
          { label: "32px", value: "32px" },
          { label: "48px", value: "48px" },
          { label: "64px", value: "64px" },
        ]
      ),
    },
    defaultProps: {
      backgroundColor: "#ffffff",
      textColor: "#0f172a",
      accentColor: "#1d4ed8",
      fontFamily: "Inter",
      borderRadius: "12px",
      horizontalPadding: "16px",
    },
    render: ({
      backgroundColor,
      textColor,
      accentColor,
      fontFamily,
      borderRadius,
      horizontalPadding,
      children,
    }) => {
      const padding = Number.parseInt(horizontalPadding ?? "0px", 10) || 0
      const radius =
        typeof borderRadius === "number"
          ? `${borderRadius}px`
          : borderRadius || "12px"
      const bg = backgroundColor || "#ffffff"
      const text = textColor || contrastColor(bg)
      const accent = accentColor || "#1d4ed8"
      const accentForeground = contrastColor(accent)
      // Button labels follow the page text color once the user picks one
      // explicitly; otherwise they fall back to a contrast color against the
      // Main color (an explicit-but-default text color would be unreadable on a
      // default navy main color).
      const buttonText =
        typeof textColor === "string" &&
        textColor &&
        textColor !== DEFAULT_TEXT_COLOR
          ? textColor
          : accentForeground
      const style: CSSProperties = {
        minHeight: "100vh",
        backgroundColor: bg,
        color: text,
        fontFamily: fontFamily || undefined,
        paddingLeft: `${padding}px`,
        paddingRight: `${padding}px`,
        ["--nuspace-radius" as string]: radius,
        ["--nuspace-text" as string]: text,
        ["--nuspace-accent" as string]: accent,
        ["--nuspace-accent-foreground" as string]: accentForeground,
        ["--nuspace-button-text" as string]: buttonText,
      }
      return <div style={style}>{children}</div>
    },
  },
}

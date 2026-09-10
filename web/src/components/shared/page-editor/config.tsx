import type { CSSProperties } from "react"
import type { Config, CustomField } from "@puckeditor/core"

import {
  ColorField,
  contrastColor,
  optionsField,
  rootFontOptions,
  rootRadiusOptions,
} from "./blocks/_lib"
import { Button, type ButtonProps } from "./blocks/Button"
import { Flex, type FlexProps } from "./blocks/Flex"
import { Grid, type GridProps } from "./blocks/Grid"
import { Heading, type HeadingProps } from "./blocks/Heading"
import { Hero, type HeroProps } from "./blocks/Hero"
import { Image, type ImageProps } from "./blocks/Image"
import { LinkTree, type LinkTreeProps } from "./blocks/LinkTree"
import { RichText, type RichTextProps } from "./blocks/RichText"
import { Space, type SpaceProps } from "./blocks/Space"
import { Stats, type StatsProps } from "./blocks/Stats"
import { Text, type TextProps } from "./blocks/Text"
import { Video, type VideoProps } from "./blocks/Video"

type PageComponents = {
  Button: ButtonProps
  Flex: FlexProps
  Grid: GridProps
  Heading: HeadingProps
  Hero: HeroProps
  Image: ImageProps
  LinkTree: LinkTreeProps
  RichText: RichTextProps
  Space: SpaceProps
  Stats: StatsProps
  Text: TextProps
  Video: VideoProps
}

type PageRootProps = {
  backgroundColor?: string
  /**
   * Global text color used ONLY by the Typography blocks (Heading, Text,
   * RichText) when they don't set their own. Buttons and other accents pick
   * their own contrast color instead.
   */
  textColor?: string
  /**
   * Brand color ("Main color") used by controls that have no explicit color of
   * their own: primary buttons, icon badges and similar accents.
   */
  accentColor?: string
  fontFamily?: string
  /** A "12px"-style value; a legacy number is also accepted. Empty means fall back to the default radius. */
  borderRadius?: string | number
  /** Renders an informational note at the top of the root fields. */
  note?: string
}

type PageCategories = "layout" | "typography" | "actions" | "media" | "other"

export type PageEditorConfig = Config<
  PageComponents,
  PageRootProps,
  PageCategories
>

function rootColorField(
  label: string
): CustomField<string | undefined> & { allowReset: boolean } {
  return { type: "custom", label, render: ColorField, allowReset: false }
}

export const pageEditorConfig: PageEditorConfig = {
  components: {
    Button: Button,
    Flex: Flex,
    Grid: Grid,
    Heading: Heading,
    Hero: Hero,
    Image: Image,
    LinkTree: LinkTree,
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
    actions: { components: ["Button", "Hero", "LinkTree"], title: "Actions" },
    media: { components: ["Image", "Video"], title: "Media" },
    other: { components: ["Stats"], title: "Other" },
  },
  root: {
    fields: {
      backgroundColor: rootColorField("Page background color"),
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
      },
      textColor: rootColorField("Text color"),
      accentColor: rootColorField("Main color"),
      fontFamily: optionsField<PageRootProps["fontFamily"]>(
        "Default font",
        rootFontOptions
      ),
      borderRadius: optionsField<PageRootProps["borderRadius"]>(
        "Border radius",
        rootRadiusOptions
      ),
    },
    defaultProps: {
      backgroundColor: "#ffffff",
      textColor: "",
      accentColor: "#1d4ed8",
      fontFamily: "Inter",
      borderRadius: "12px",
    },
    render: ({
      backgroundColor,
      textColor,
      accentColor,
      fontFamily,
      borderRadius,
      children,
    }) => {
      const radius =
        typeof borderRadius === "number"
          ? `${borderRadius}px`
          : borderRadius || "12px"
      const bg = backgroundColor || "#ffffff"
      const accent = accentColor || "#1d4ed8"
      const text = textColor || contrastColor(bg)
      const pageText = contrastColor(bg)
      const style: CSSProperties = {
        minHeight: "100vh",
        backgroundColor: bg,
        color: text,
        fontFamily: fontFamily || undefined,
        ["--nuspace-radius" as string]: radius,
        ["--nuspace-text" as string]: text,
        ["--nuspace-page-text" as string]: pageText,
        ["--nuspace-accent" as string]: accent,
        ["--nuspace-accent-foreground" as string]: contrastColor(accent),
      }
      return <div style={style}>{children}</div>
    },
  },
}

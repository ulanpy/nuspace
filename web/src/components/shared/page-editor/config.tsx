import type { Config } from "@puckeditor/core"
import { Button } from "./blocks/Button"
import { Card, type CardProps } from "./blocks/Card"
import { Flex, type FlexProps } from "./blocks/Flex"
import { Grid, type GridProps } from "./blocks/Grid"
import { Heading, type HeadingProps } from "./blocks/Heading"
import { Hero } from "./blocks/Hero"
import { LinkButton } from "./blocks/LinkButton"
import { Logos } from "./blocks/Logos"
import { PhotoBlock } from "./blocks/PhotoBlock"
import { RichText, type RichTextProps } from "./blocks/RichText"
import { Space } from "./blocks/Space"
import { Stats } from "./blocks/Stats"
import { Text, type TextProps } from "./blocks/Text"
import { TextBlock } from "./blocks/TextBlock"
import { VideoEmbed } from "./blocks/VideoEmbed"

// --- Block prop types ---

type LinkButtonProps = {
  title: string
  description: string
  url: string
}

type TextBlockProps = {
  body: string
}

type PhotoBlockProps = {
  image: string
  alt: string
}

type VideoEmbedProps = {
  url: string
}

type HeroProps = {
  title: string
  description: string
  buttons: { label: string; href: string; variant?: string }[]
  align: "left" | "center"
  padding: string
  image?: { mode?: "inline" | "background"; url?: string }
}

type StatsProps = {
  items: { title: string; description: string }[]
}

type LogosProps = {
  logos: { alt: string; image: string }[]
}

type SpaceProps = {
  direction?: "" | "vertical" | "horizontal"
  size: string
}

// --- Aggregated ---

type PageComponents = {
  LinkButton: LinkButtonProps
  TextBlock: TextBlockProps
  PhotoBlock: PhotoBlockProps
  VideoEmbed: VideoEmbedProps
  Button: {
    label: string
    href: string
    variant: "primary" | "secondary"
    size: "small" | "large"
  }
  Card: CardProps
  Flex: FlexProps
  Grid: GridProps
  Heading: HeadingProps
  Hero: HeroProps
  Logos: LogosProps
  RichText: RichTextProps
  Space: SpaceProps
  Stats: StatsProps
  Text: TextProps
}

type PageRootProps = Record<string, never>

type PageCategories =
  "hero" | "content" | "buttons" | "media" | "layout" | "stats"

export type PageEditorConfig = Config<
  PageComponents,
  PageRootProps,
  PageCategories
>

export const pageEditorConfig: PageEditorConfig = {
  components: {
    LinkButton: LinkButton,
    TextBlock: TextBlock,
    PhotoBlock: PhotoBlock,
    VideoEmbed: VideoEmbed,
    Button: Button,
    Card: Card,
    Flex: Flex,
    Grid: Grid,
    Heading: Heading,
    Hero: Hero,
    Logos: Logos,
    RichText: RichText,
    Space: Space,
    Stats: Stats,
    Text: Text,
  },
  categories: {
    hero: { components: ["Hero"], title: "Hero" },
    content: {
      components: ["Heading", "Text", "RichText", "Card", "Button"],
      title: "Content",
    },
    buttons: { components: ["LinkButton"], title: "Buttons" },
    media: {
      components: ["PhotoBlock", "VideoEmbed", "Logos"],
      title: "Media",
    },
    layout: {
      components: ["TextBlock", "Grid", "Flex", "Space"],
      title: "Layout",
    },
    stats: { components: ["Stats"], title: "Stats" },
  },
  root: {
    fields: {},
    render: ({ children }) => <>{children}</>,
  },
}

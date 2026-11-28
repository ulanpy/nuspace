import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildTransferCreditMappings,
  mergeTransferCreditMappings,
  nextStatusSort,
  sortRequirements,
  transferCreditMappingRows,
} from "./functions"

describe("requirement status sort", () => {
  const rows = [
    { code: "A", status: "Satisfied" },
    { code: "B", status: "Pending" },
    { code: "C", status: "Satisfied" },
    { code: "D", status: "Pending" },
  ]
  const codes = (sorted: typeof rows) => sorted.map((row) => row.code)

  it("puts outstanding first and keeps the audit's order within a group", () => {
    assert.deepEqual(codes(sortRequirements(rows, "pending")), [
      "B",
      "D",
      "A",
      "C",
    ])
  })

  it("can lead with satisfied instead", () => {
    assert.deepEqual(codes(sortRequirements(rows, "satisfied")), [
      "A",
      "C",
      "B",
      "D",
    ])
  })

  it("returns the audit's order untouched, as a copy", () => {
    const sorted = sortRequirements(rows, "source")
    assert.deepEqual(codes(sorted), ["A", "B", "C", "D"])
    assert.notEqual(sorted, rows)
  })

  it("cycles through all three orders", () => {
    assert.equal(nextStatusSort("pending"), "satisfied")
    assert.equal(nextStatusSort("satisfied"), "source")
    assert.equal(nextStatusSort("source"), "pending")
  })
})

describe("transfer-credit mappings", () => {
  it("starts with transcript credits and leaves the NU code blank", () => {
    assert.deepEqual(
      transferCreditMappingRows([
        { code: "HST 152", title: "World history", credits: 6 },
      ]),
      [
        {
          originalCode: "HST 152",
          title: "World history",
          originalCredits: 6,
          mappedCode: "",
          mappedCredits: "6",
        },
      ]
    )
  })

  it("normalizes mapped courses and skips deliberately blank rows", () => {
    const result = buildTransferCreditMappings([
      {
        originalCode: " hst  152 ",
        title: "World history",
        originalCredits: 6,
        mappedCode: " hist  101 ",
        mappedCredits: "5",
      },
      {
        originalCode: "BIO 100",
        title: "Biology",
        originalCredits: 3,
        mappedCode: "",
        mappedCredits: "3",
      },
    ])

    assert.deepEqual(result, {
      mappings: [
        {
          original_code: "HST 152",
          mapped_code: "HIST 101",
          mapped_credits: 5,
        },
      ],
      errors: {},
    })
  })

  it("rejects non-positive credits for a mapped row", () => {
    const result = buildTransferCreditMappings([
      {
        originalCode: "HST 152",
        title: "World history",
        originalCredits: 6,
        mappedCode: "HIST 101",
        mappedCredits: "0",
      },
    ])

    assert.deepEqual(result.mappings, [])
    assert.match(result.errors["HST 152"] ?? "", /positive/)
  })

  it("keeps earlier mappings across repeated reruns and replaces corrections", () => {
    assert.deepEqual(
      mergeTransferCreditMappings(
        [
          {
            original_code: "HST 152",
            mapped_code: "HIST 101",
            mapped_credits: 5,
          },
          {
            original_code: "BIO 100",
            mapped_code: "BIOL 100",
            mapped_credits: 3,
          },
        ],
        [
          {
            original_code: "HST 152",
            mapped_code: "HIST 102",
            mapped_credits: 6,
          },
        ]
      ),
      [
        {
          original_code: "HST 152",
          mapped_code: "HIST 102",
          mapped_credits: 6,
        },
        {
          original_code: "BIO 100",
          mapped_code: "BIOL 100",
          mapped_credits: 3,
        },
      ]
    )
  })
})

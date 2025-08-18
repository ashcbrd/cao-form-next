"use client"

import { useState } from "react"
import type { Question } from "@/lib/form/types"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle, HelpCircle } from "lucide-react"

interface QuestionRendererProps {
  question: Question
  value: any
  onChange: (value: any) => void
  error?: string
}

export function QuestionRenderer({ question, value, onChange, error }: QuestionRendererProps) {
  const [explanation, setExplanation] = useState("")

  const formatCurrency = (val: string) => {
    const num = Number.parseFloat(val.replace(/[^0-9.]/g, ""))
    return isNaN(num) ? "" : num.toLocaleString("en-US", { minimumFractionDigits: 2 })
  }

  const formatPercent = (val: string) => {
    const num = Number.parseFloat(val.replace(/[^0-9.]/g, ""))
    return isNaN(num) ? "" : `${num}%`
  }

  const renderInput = () => {
    switch (question.type) {
      case "TEXT":
        return (
          <Input
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${question.text.toLowerCase()}`}
            className={error ? "border-red-500" : ""}
          />
        )

      case "TEXTAREA":
        return (
          <Textarea
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${question.text.toLowerCase()}`}
            rows={4}
            className={error ? "border-red-500" : ""}
          />
        )

      case "NUMBER":
        return (
          <Input
            type="number"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0"
            min={question.validation?.min}
            max={question.validation?.max}
            className={error ? "border-red-500" : ""}
          />
        )

      case "MONEY":
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">€</span>
            <Input
              type="text"
              value={value ? formatCurrency(value.toString()) : ""}
              onChange={(e) => {
                const cleanValue = e.target.value.replace(/[^0-9.]/g, "")
                onChange(cleanValue)
              }}
              placeholder="0.00"
              className={`pl-8 ${error ? "border-red-500" : ""}`}
            />
          </div>
        )

      case "PERCENT":
        return (
          <div className="relative">
            <Input
              type="number"
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder="0"
              min={0}
              max={100}
              className={`pr-8 ${error ? "border-red-500" : ""}`}
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
          </div>
        )

      case "SELECT":
        return (
          <Select value={value || ""} onValueChange={onChange}>
            <SelectTrigger className={error ? "border-red-500" : ""}>
              <SelectValue placeholder={`Select ${question.text.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case "MULTISELECT":
        return (
          <div className="space-y-2">
            {question.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${question.id}-${option}`}
                  checked={Array.isArray(value) && value.includes(option)}
                  onCheckedChange={(checked) => {
                    const currentValues = Array.isArray(value) ? value : []
                    if (checked) {
                      onChange([...currentValues, option])
                    } else {
                      onChange(currentValues.filter((v) => v !== option))
                    }
                  }}
                />
                <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
              </div>
            ))}
          </div>
        )

      case "MULTISELECT_WITH_EXPLANATION":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              {question.options?.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${question.id}-${option}`}
                    checked={Array.isArray(value?.selected) && value.selected.includes(option)}
                    onCheckedChange={(checked) => {
                      const currentSelected = Array.isArray(value?.selected) ? value.selected : []
                      const newSelected = checked
                        ? [...currentSelected, option]
                        : currentSelected.filter((v) => v !== option)

                      onChange({
                        selected: newSelected,
                        explanation: value?.explanation || "",
                      })
                    }}
                  />
                  <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
                </div>
              ))}
            </div>
            <Textarea
              placeholder="Please explain your selections..."
              value={value?.explanation || ""}
              onChange={(e) =>
                onChange({
                  selected: value?.selected || [],
                  explanation: e.target.value,
                })
              }
              rows={3}
            />
          </div>
        )

      case "YES_NO_WITH_EXPLANATION":
        return (
          <div className="space-y-4">
            <RadioGroup
              value={value?.answer || ""}
              onValueChange={(answer) =>
                onChange({
                  answer,
                  explanation: value?.explanation || "",
                })
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id={`${question.id}-yes`} />
                <Label htmlFor={`${question.id}-yes`}>Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id={`${question.id}-no`} />
                <Label htmlFor={`${question.id}-no`}>No</Label>
              </div>
            </RadioGroup>

            {value?.answer && (
              <Textarea
                placeholder="Please explain..."
                value={value?.explanation || ""}
                onChange={(e) =>
                  onChange({
                    answer: value?.answer,
                    explanation: e.target.value,
                  })
                }
                rows={3}
              />
            )}
          </div>
        )

      case "RADIO":
        return (
          <RadioGroup value={value || ""} onValueChange={onChange}>
            {question.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        )

      case "DATE":
        return (
          <Input
            type="date"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className={error ? "border-red-500" : ""}
          />
        )

      case "FILE":
        return (
          <Input
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                onChange(file)
              }
            }}
            className={error ? "border-red-500" : ""}
          />
        )

      default:
        return <div>Unsupported question type: {question.type}</div>
    }
  }

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Label className="text-base font-medium flex items-center gap-2">
                {question.text}
                {question.isRequired && <span className="text-red-500">*</span>}
                {question.helpText && <HelpCircle className="h-4 w-4 text-gray-400" title={question.helpText} />}
              </Label>
              {question.helpText && <p className="text-sm text-gray-600 mt-1">{question.helpText}</p>}
            </div>
          </div>

          {renderInput()}

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

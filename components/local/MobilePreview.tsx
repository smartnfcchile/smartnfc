"use client";

import React from "react";
import UrbanLocalTemplate, { UrbanTemplateData } from "./UrbanLocalTemplate";

type MobilePreviewProps = {
  campaign: UrbanTemplateData;
};

export default function MobilePreview({ campaign }: MobilePreviewProps) {
  return <UrbanLocalTemplate data={campaign} mode="preview" />;
}

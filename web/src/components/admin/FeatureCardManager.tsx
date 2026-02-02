"use client";
import React from "react";
import ImageListManager from "./ImageListManager";

export type FeatureCard = {
  title?: string;
  desc?: string;
  images?: string[];
};

export type FeatureCardManagerProps = {
  label: string;
  value: FeatureCard;
  onChange: (next: FeatureCard) => void;
  showImages?: boolean; // default true; when false, hide ImageListManager (read-only mode)
};

export default function FeatureCardManager({ label, value, onChange, showImages = true }: FeatureCardManagerProps) {
  const v = value || {};
  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <h3 className="font-medium mb-2">{label}</h3>
      <input
        type="text"
        placeholder="Title"
        value={v.title || ""}
        onChange={(e) => onChange({ ...v, title: e.target.value })}
        className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <textarea
        placeholder="Description"
        value={v.desc || ""}
        onChange={(e) => onChange({ ...v, desc: e.target.value })}
        rows={2}
        className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {showImages && (
        <ImageListManager
          label="Images"
          images={v.images || []}
          onChange={(next) => onChange({ ...v, images: next })}
        />
      )}
    </div>
  );
}

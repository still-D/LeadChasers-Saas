import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ProjectBrief } from "../briefs";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica", color: "#13261d", backgroundColor: "#ffffff" },
  header: { marginBottom: 24, borderBottom: "1px solid #d8ddd8", paddingBottom: 16 },
  brand: { fontSize: 9, fontWeight: 700, color: "#076c44", letterSpacing: 1.2, marginBottom: 6 },
  title: { fontSize: 22, fontWeight: 700, color: "#071410", marginBottom: 6 },
  subtitle: { fontSize: 10, color: "#67746c" },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: "#076c44", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  paragraph: { fontSize: 10, lineHeight: 1.5, marginBottom: 6, color: "#13261d" },
  listItem: { fontSize: 10, lineHeight: 1.5, marginBottom: 3, paddingLeft: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", borderBottom: "1px solid #e6eae6", paddingVertical: 8 },
  rowLabel: { fontSize: 10, color: "#67746c", fontWeight: 700 },
  rowValue: { fontSize: 10, color: "#13261d" },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 8, color: "#aebbb3", borderTop: "1px solid #e6eae6", paddingTop: 8 },
});

export function BriefPdfDocument({ brief, projectCode, productionTypeLabel }: { brief: ProjectBrief; projectCode: string; productionTypeLabel: string }) {
  const generatedAt = new Date(brief.created_at);
  const content = brief.content;

  return (
    <Document title={brief.title} author="LeadChasers OS">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>LEADCHASERS OS</Text>
          <Text style={styles.title}>{brief.title}</Text>
          <Text style={styles.subtitle}>{projectCode} · {productionTypeLabel} · Généré le {generatedAt.toLocaleDateString("fr-MA")}</Text>
        </View>

        {brief.client_name && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client</Text>
            <Text style={styles.paragraph}>{brief.client_name}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Résumé</Text>
          <Text style={styles.paragraph}>{content.summary}</Text>
        </View>

        {content.sections.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item, i) => <Text key={i} style={styles.listItem}>• {item}</Text>)}
          </View>
        ))}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Équipe</Text>
          {content.crew.length ? content.crew.map((item, i) => <Text key={i} style={styles.listItem}>• {item}</Text>) : <Text style={styles.paragraph}>Équipe à définir.</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Matériel</Text>
          {content.equipment.length ? content.equipment.map((item, i) => <Text key={i} style={styles.listItem}>• {item}</Text>) : <Text style={styles.paragraph}>Matériel à définir.</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Logistique</Text>
          {content.logistics.length ? content.logistics.map((item, i) => <Text key={i} style={styles.listItem}>• {item}</Text>) : <Text style={styles.paragraph}>Logistique à définir.</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budget</Text>
          <Text style={styles.paragraph}>{content.budgetNotes}</Text>
        </View>

        <View style={styles.footer}>
          <Text>Document généré par LeadChasers OS — {generatedAt.toLocaleString("fr-MA")}</Text>
        </View>
      </Page>
    </Document>
  );
}

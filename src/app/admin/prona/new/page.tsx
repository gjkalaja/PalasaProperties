import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { PageHeader } from "@/components/ui";
import { PropertyForm } from "@/components/PropertyForm";
import { saveProperty } from "../actions";

export default async function NewProperty() {
  const { t } = await getT();
  const [owners, cleaners] = await Promise.all([
    db.user.findMany({ where: { role: "OWNER" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.user.findMany({ where: { role: "CLEANER" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <>
      <PageHeader title={t.propertyAdmin.new} back="/admin/prona" />
      <PropertyForm
        action={saveProperty}
        d={{ amenities: ["wifi", "ac", "kitchen"], maxGuests: 4, bedrooms: 1, beds: 2, bathrooms: 1, basePrice: 80, cleaningFee: 30, minNights: 2 }}
        owners={owners}
        cleaners={cleaners}
        t={{ propertyAdmin: t.propertyAdmin, propertyTypes: t.propertyTypes, amenities: t.amenities, common: t.common, public: t.public }}
      />
    </>
  );
}

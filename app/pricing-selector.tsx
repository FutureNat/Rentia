'use client';

import { useState } from 'react';
import { RENTIA_PLANS } from '../lib/plans';
import PlanConfigurator from '../components/plan-configurator';

export default function PricingSelector() {
  const [annual,setAnnual]=useState(false);

  return <PlanConfigurator plans={RENTIA_PLANS} annual={annual} onAnnualChange={setAnnual} publicPricing/>;
}

import { AOKBaseHandler, AOKHandlerResponse } from './types'
import { NutritionHandler } from './NutritionHandler'
import { DentalHandler } from './DentalHandler'
import { TherapyHandler } from './TherapyHandler'
import { PreventionHandler } from './PreventionHandler'
import { MedicalTreatmentHandler } from './MedicalTreatmentHandler'
import { RehabilitationHandler } from './RehabilitationHandler'
import { FamilyHandler } from './FamilyHandler'
import { VisionHearingHandler } from './VisionHearingHandler'
import { SportsHandler } from './SportsHandler'

export class AOKHandlerManager {
  private handlers: AOKBaseHandler[]

  constructor() {
    this.handlers = [
      new NutritionHandler(),
      new DentalHandler(),
      new TherapyHandler(),
      new PreventionHandler(),
      new MedicalTreatmentHandler(),
      new RehabilitationHandler(),
      new FamilyHandler(),
      new VisionHearingHandler(),
      new SportsHandler()
    ]
  }

  async handleQuery(query: string): Promise<AOKHandlerResponse | null> {
    const lowerQuery = query.toLowerCase()
    
    for (const handler of this.handlers) {
      if (handler.canHandle(lowerQuery)) {
        return await handler.handleQuery(lowerQuery)
      }
    }

    return null
  }
} 
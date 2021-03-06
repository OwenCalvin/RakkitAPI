import { IType } from '../..'

export class RMap implements IType {
  TypeName: string = 'map'
  IsEditable: boolean
  IsInHeader: boolean
  IsSearchable: boolean
  PlaceOrder: number
  Placeholder: string
  PropertyToShow: string

  constructor(
    propertyToShow: string,
    isInHeader: boolean = false,
    isSearchable: boolean = false,
    isEditable: boolean = true,
    placeOrder: number = 0
  ) {
    this.PropertyToShow = propertyToShow
    this.IsEditable = isEditable
    this.IsInHeader = isInHeader
    this.IsSearchable = isSearchable
    this.PlaceOrder = placeOrder
  }
}

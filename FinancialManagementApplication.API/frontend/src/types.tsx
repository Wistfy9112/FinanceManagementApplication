
export interface ExpenseCategoryDTO{
    CategoryID: string,
    Name: string,
    Description: string,
    AccountID: string,
    CreateAt: string,
    UpdateAt: string
}

export interface CreateExpenseCategoryDTO{
    Name: string,
    Description: string,
    AccountID: string
}

export interface UpdateExpenseCategoryDTO{
    Name: string,
    Description: string
}